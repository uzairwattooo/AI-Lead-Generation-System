import {NextResponse} from "next/server";
import {apiError,handleRouteError,requireSession} from "@/server/api";
import {createSupabaseAdminClient} from "@/server/supabase-admin";
import {isDemoMode,serverEnv} from "@/server/env";
import {retryOptions,safeOperationalError} from "@/server/operations/policy";
import {storedMilestones,mergeTimeline} from "@/server/operations/timeline";
import type {ActivityEvent} from "@/types";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireSession();if(!auth.ok)return auth.response;
 if(isDemoMode())return apiError("Live diagnostics is unavailable in demo mode.",409);
 try{
  const {id}=await params;const admin=createSupabaseAdminClient();
  const [p,c]=await Promise.all([admin.from("lead_pipeline").select("*").eq("id",id).maybeSingle(),admin.from("lead_discovery_candidates").select("*").eq("id",id).maybeSingle()]);
  if(p.error||c.error)throw new Error((p.error||c.error)!.message);
  const lead=p.data||(c.data?{...c.data,approval_status:c.data.review_status}:null);if(!lead||lead.dashboard_deleted_at)return apiError("Lead not found.",404);
  const [direct,related,requestEvents]=await Promise.all([
   admin.from("codenativex_dashboard_activity").select("*").eq("lead_id",id).order("created_at",{ascending:false}).limit(70),
   lead.lead_key?admin.from("codenativex_dashboard_activity").select("*").eq("lead_key",lead.lead_key).order("created_at",{ascending:false}).limit(70):Promise.resolve({data:[],error:null}),
   lead.job_id?admin.from("codenativex_dashboard_activity").select("*").eq("request_id",lead.job_id).is("lead_id",null).order("created_at",{ascending:false}).limit(20):Promise.resolve({data:[],error:null}),
  ]);
  if(direct.error||related.error||requestEvents.error)throw new Error(`Apply the dashboard operations migration: ${(direct.error||related.error||requestEvents.error)!.message}`);
  const events=[...(direct.data||[]),...(related.data||[]),...(requestEvents.data||[])].map(row=>({id:row.id,leadId:row.lead_id,requestId:row.request_id,actor:row.actor,action:row.action,message:row.message,severity:row.severity,createdAt:row.created_at})) as ActivityEvent[];
  return NextResponse.json({timeline:mergeTimeline([...events,...storedMilestones(lead)]),retries:retryOptions(lead),outreachStatus:lead.outreach_status||"not_started",auditStatus:lead.audit_status||"not_started",lastError:safeOperationalError(lead.last_outreach_error||lead.audit_error_message)||null,notification:{status:lead.admin_notification_status||"not_recorded",error:safeOperationalError(lead.admin_notification_error)||null,sentAt:lead.admin_notification_sent_at||null,configuredRecipient:serverEnv.adminNotificationEmail||null},trackingNote:"Stored milestones cover earlier activity; detailed changes are recorded after tracking was enabled."});
 }catch(e){return handleRouteError(e);}
}
