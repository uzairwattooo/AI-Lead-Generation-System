import "server-only";
import {createSupabaseAdminClient} from "@/server/supabase-admin";
import {dispatchToN8n} from "@/server/n8n";
import {safeOperationalError} from "./policy";

/** Persist dispatch errors without undoing SMTP progress or a newer approval. */
export async function dispatchApprovedOutreach(leadId:string,payload:unknown){
 const admin=createSupabaseAdminClient();
 const {data:lead,error}=await admin.from("lead_pipeline").select("outreach_approved_at").eq("id",leadId).maybeSingle();
 if(error)throw new Error(error.message);
 if(!lead?.outreach_approved_at)throw new Error("Email approval is no longer active.");
 try {
  const result=await dispatchToN8n("outreach",payload);
  if(!result.dispatched)throw new Error(result.detail);
  return result;
 }catch(error){
  const {data:current,error:stateError}=await admin.from("lead_pipeline").select("gmail_message_id").eq("id",leadId).maybeSingle();
  if(!stateError&&current?.gmail_message_id)return {dispatched:true,detail:"Client email was sent. A later workflow step failed; check admin notification status."};
  const {error:saveError}=await admin.from("lead_pipeline").update({status:"outreach_dispatch_failed",last_outreach_error:safeOperationalError(error instanceof Error?error.message:error),next_action:"retry_outreach_dispatch"})
   .eq("id",leadId).eq("outreach_approved_at",lead.outreach_approved_at).eq("email_preview_status","approved").eq("outreach_status","queued").is("last_outreach_error",null).is("gmail_message_id",null).is("first_outreach_at",null).is("outreach_send_key",null);
  if(saveError)throw new Error(`${safeOperationalError(error)}; could not persist dispatch error: ${saveError.message}`);
  throw error;
 }
}
