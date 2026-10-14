import { NextResponse } from "next/server";
import { apiError,handleRouteError,requireSession } from "@/server/api";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { conceptEmail,usableEmail } from "@/server/lead-tools/policy";
import { renderProfessionalEmail } from "@/server/outreach/email-template";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}) {
 const session=await requireSession();if(!session.ok)return session.response;
 try {const {id}=await params;const admin=createSupabaseAdminClient();const {data:lead,error}=await admin.from("lead_pipeline").select("*").eq("id",id).maybeSingle();if(error)throw new Error(error.message);
 if(!lead?.visual_concept_path||lead.approval_status!=="approved"||lead.do_not_contact||lead.dashboard_deleted_at||lead.gmail_message_id||lead.outreach_status==="sending"||Number(lead.duplicate_count||0)>0||!usableEmail(lead.email||""))return apiError("An approved, contactable unsent lead and a ready concept are required.",409);
 const copy=conceptEmail(lead.company_name,lead.decision_maker_status==="verified"?String(lead.contact_name||"").split(/\s+/)[0]:null);const rendered=renderProfessionalEmail({companyName:lead.company_name,body:copy.body,findings:[]});
 const {data:saved,error:saveError}=await admin.from("lead_pipeline").update({outreach_subject:copy.subject,outreach_body:rendered.plainText,outreach_html_body:rendered.html,outreach_plain_text_body:rendered.plainText,outreach_include_concept:true,email_preview_status:"awaiting_approval",outreach_approved_at:null,human_review_required:true,outreach_status:"awaiting_approval",status:"email_draft_ready",next_workflow:null,updated_at:new Date().toISOString()}).eq("id",id).eq("approval_status","approved").eq("visual_concept_job_id",lead.visual_concept_job_id).is("gmail_message_id",null).neq("outreach_status","sending").select("id").maybeSingle();if(saveError)throw new Error(saveError.message);if(!saved)return apiError("Lead changed; refresh before preparing email.",409);
 return NextResponse.json({prepared:true}); }catch(error){return handleRouteError(error);}
}
