import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError,handleRouteError } from "@/server/api";
import { requireN8nSecret } from "@/server/internal-auth";
import { loadReplyAction } from "@/server/outreach/reply-action";
import { runWebsiteAudit } from "@/server/audits/audit-engine";
import { buildRequestedReply } from "@/server/outreach/reply-content";
import { serverEnv } from "@/server/env";
export const runtime="nodejs"; export const maxDuration=300;
const schema=z.object({id:z.string().uuid(),key:z.string().uuid()});
export async function POST(request:Request){
 const auth=requireN8nSecret(request);if(auth)return auth;
 try{
  const parsed=schema.safeParse(await request.json());if(!parsed.success)return apiError("Action ID and claim key are required.",422);
  let {lead}=await loadReplyAction(parsed.data.id,parsed.data.key);
  const {action,admin}=await loadReplyAction(parsed.data.id,parsed.data.key);
  if(["report","report_and_video"].includes(action.action)&&(!lead.audit_report_url||lead.audit_status!=="audit_completed")){
   await runWebsiteAudit(lead.id,{replyReport:true});
   ({lead}=await loadReplyAction(parsed.data.id,parsed.data.key));
  }
  if(["report","report_and_video"].includes(action.action)&&(!lead.audit_report_url||lead.audit_status!=="audit_completed"||Number(lead.audit_confidence)<serverEnv.auditConfidenceThreshold))throw new Error("Report needs human review; no unverified report was sent.");
  if (["video", "report_and_video"].includes(action.action) && !lead.outreach_video_url) {
   const {error: blockedError} = await admin.from("codenativex_reply_actions").update({status:"needs_review",error_message:"video_not_ready"}).eq("id",action.id).eq("claim_key",action.claim_key).eq("status","processing");
   if (blockedError) throw new Error(blockedError.message);
   return NextResponse.json({ waitingForVideo: true, leadId: lead.id, action: action.action, message: "Add the recorded video link in this lead's Outreach tab. No reply has been sent." });
  }
  const url = action.action === "booking" ? new URL(serverEnv.meetingBookingUrl) : null;
  if (url) { url.searchParams.set("email",lead.email); if(lead.contact_name)url.searchParams.set("name",lead.contact_name); }
  const body = buildRequestedReply({
   action: action.action,
   companyName: lead.company_name,
   firstName: lead.contact_name && lead.decision_maker_status === "verified" ? String(lead.contact_name).trim().split(/\s+/)[0] : null,
   videoUrl: lead.outreach_video_url,
   meetingUrl: url?.toString(),
  });
  return NextResponse.json({id:action.id,key:action.claim_key,leadId:lead.id,action:action.action,replyMessageId:lead.reply_message_id,threadId:lead.gmail_thread_id,body});
 }catch(error){return handleRouteError(error);}
}
