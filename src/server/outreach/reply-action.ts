import { createSupabaseAdminClient } from "@/server/supabase-admin";
export async function loadReplyAction(id: string,key: string) {
 const admin=createSupabaseAdminClient();
 const {data:action,error}=await admin.from("codenativex_reply_actions").select("*").eq("id",id).eq("claim_key",key).in("status",["processing","sending"]).maybeSingle();
 if(error)throw new Error(error.message); if(!action)throw new Error("Reply action claim is no longer active.");
 const {data:lead,error:e}=await admin.from("lead_pipeline").select("*").eq("id",action.lead_id).maybeSingle();
 if(e)throw new Error(e.message);
 if(!lead||lead.do_not_contact||lead.reply_message_id!==action.reply_message_id||!["report_requested","meeting_requested"].includes(lead.status))throw new Error("Reply action stopped: a newer reply or contact restriction exists.");
 if(!lead.gmail_thread_id||!lead.reply_message_id||!lead.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email))throw new Error("A valid recipient and Gmail reply thread are required.");
 return {admin,action,lead};
}
