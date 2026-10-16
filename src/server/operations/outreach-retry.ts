import "server-only";
import {randomUUID} from "node:crypto";
import {createSupabaseAdminClient} from "@/server/supabase-admin";
import {retryOptions} from "./policy";
export async function claimOutreachRetry(lead:Record<string,unknown>,admin=createSupabaseAdminClient()){
 const option=retryOptions(lead).find(x=>x.kind==="outreach")!;
 if(!option.allowed)throw new Error(option.reason||"Retry blocked.");
 const now=new Date().toISOString();
 const {data,error}=await admin.from("lead_pipeline").update({dashboard_retry_key:randomUUID(),dashboard_retry_at:now,updated_at:now,outreach_status:"queued",status:"outreach_queued",last_outreach_error:null,next_action:"send_personalized_email",next_workflow:"03 - Personalized Evidence-Based Email Outreach"})
  .eq("id",lead.id).eq("updated_at",lead.updated_at).eq("approval_status","approved").eq("do_not_contact",false).eq("email_preview_status","approved").eq("outreach_status",lead.outreach_status).is("gmail_message_id",null).is("first_outreach_at",null).is("outreach_send_key",null).is("dashboard_deleted_at",null).select("id").maybeSingle();
 if(error)throw new Error(error.message);
 return Boolean(data);
}
