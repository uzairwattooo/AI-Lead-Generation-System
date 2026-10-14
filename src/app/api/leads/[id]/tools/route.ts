import { after, NextResponse } from "next/server";
import { z } from "zod";
import { apiError,handleRouteError,requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { runLeadToolJob } from "@/server/lead-tools/jobs";
import { staleJobReason } from "@/server/lead-tools/execution-policy";
import { conceptBlockedReason } from "@/lib/lead-tools-availability";
export const maxDuration = 300;
import { usableEmail,contactCandidateSchema } from "@/server/lead-tools/policy";
const inputSchema=z.object({kind:z.enum(["contacts","concept"])});
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
 const session=await requireSession(); if(!session.ok) return session.response;
 try {const {id}=await params; const {data,error}=await createSupabaseAdminClient().from("codenativex_lead_tool_jobs").select("id,kind,status,result,error_message,created_at,updated_at").eq("lead_id",id).order("created_at",{ascending:false}).limit(10); if(error) throw new Error(error.message);
 for(const job of data||[]) {
   const reason=staleJobReason(job); if(!reason) continue;
   const {data:expired,error:expireError}=await createSupabaseAdminClient().from("codenativex_lead_tool_jobs").update({status:"failed",error_message:reason,updated_at:new Date().toISOString()}).eq("id",job.id).eq("status",job.status).eq("updated_at",job.updated_at).select("id").maybeSingle();
   if(expireError) throw new Error(expireError.message);
   if(expired){job.status="failed";job.error_message=reason;}
 }
 return NextResponse.json(data); }catch(error){return handleRouteError(error);}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const session=await requireSession(); if(!session.ok) return session.response;
 try {
 const {id}=await params; const input=inputSchema.safeParse(await request.json()); if(!input.success) return apiError("Invalid tool.",422);
 const {repository}=await getRepositoryContext(); const lead=await repository.getLead(id); if(!lead||lead.dashboardDeletedAt) return apiError("Lead not found.",404);
 if(!process.env.OPENAI_API_KEY) return apiError("Configure OPENAI_API_KEY on the server.",503);
 if(input.data.kind==="concept") {const reason=conceptBlockedReason(lead);if(reason)return apiError(reason,409);}
 if(input.data.kind==="concept"&&!process.env.BROWSERLESS_TOKEN) return apiError("Configure BROWSERLESS_TOKEN for full-page screenshots.",503);
 const admin=createSupabaseAdminClient();
 const {data:active,error:activeError}=await admin.from("codenativex_lead_tool_jobs").select("id,kind,status,updated_at").eq("lead_id",id).eq("kind",input.data.kind).in("status",["queued","processing"]).maybeSingle();
 if(activeError) throw new Error(activeError.message);
 if(active) {
   const reason=staleJobReason(active);
   if(!reason) return NextResponse.json({job:active,existing:true});
   const {error:staleError}=await admin.from("codenativex_lead_tool_jobs").update({status:"failed",error_message:reason,updated_at:new Date().toISOString()}).eq("id",active.id).eq("status",active.status).eq("updated_at",active.updated_at);
   if(staleError) throw new Error(staleError.message);
 }
 const {data:job,error}=await admin.from("codenativex_lead_tool_jobs").insert({lead_id:id,kind:input.data.kind,requested_by:session.email,target:{companyName:lead.companyName,city:lead.city,website:lead.website}}).select("id,status").single();
 if(error) throw new Error(error.message);
 // Next keeps work alive after returning 202; no webhook queue is needed.
 after(async()=>{await runLeadToolJob(job.id);});
 return NextResponse.json({job},{status:202});
 }catch(error){return handleRouteError(error);}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
 const session=await requireSession();if(!session.ok)return session.response;
 try {
 const {id}=await params;const input=z.object({jobId:z.string().uuid(),index:z.number().int().min(0).max(5)}).safeParse(await request.json());if(!input.success)return apiError("Invalid contact selection.",422);
 const admin=createSupabaseAdminClient();const {data:job,error}=await admin.from("codenativex_lead_tool_jobs").select("result").eq("id",input.data.jobId).eq("lead_id",id).eq("kind","contacts").eq("status","completed").maybeSingle();if(error)throw new Error(error.message);
 const contact=job?.result?.candidates?.[input.data.index];if(!contact?.confirmed)return apiError("Contact could not be confirmed on the public source. Review it manually; it was not applied.",409);
 const parsed=contactCandidateSchema.safeParse(contact);if(!parsed.success)return apiError("Invalid contact evidence.",409);
 const {repository}=await getRepositoryContext();const lead=await repository.getLead(id);if(!lead||lead.dashboardDeletedAt)return apiError("Lead not found.",404);
 if(lead.outreachStatus==="initial_email_sent"||lead.rawOutreachStatus==="sending"||lead.outreachStatus==="awaiting_reply")return apiError("Contact cannot change during or after sending.",409);
 const patch:Record<string,unknown>={updated_at:new Date().toISOString()};
 // Preserve existing real contacts; fill missing/placeholder values only.
 if(!usableEmail(lead.email||"")&&usableEmail(parsed.data.email))patch.email=parsed.data.email;
 if(!lead.phone&&parsed.data.phone)patch.phone=parsed.data.phone;
 if(lead.pipelineLeadId){const {data:updated,error:e}=await admin.from("lead_pipeline").update({...patch,contact_source_url:parsed.data.sourceUrl,contact_name:parsed.data.name||null,job_title:parsed.data.role||null,email_validation_status:"unverified",outreach_approved_at:null,email_preview_status:null,outreach_status:"not_started",next_workflow:null}).eq("id",lead.pipelineLeadId).is("gmail_message_id",null).neq("outreach_status","sending").is("dashboard_deleted_at",null).select("id").maybeSingle();if(e)throw new Error(e.message);if(!updated)return apiError("Lead changed during research; contact was not applied.",409);}
 if(lead.candidateId){const {error:e}=await admin.from("lead_discovery_candidates").update(patch).eq("id",lead.candidateId);if(e)throw new Error(e.message);}
 return NextResponse.json({saved:true});
 }catch(error){return handleRouteError(error);}
}
