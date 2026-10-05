import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError,handleRouteError } from "@/server/api";
import { requireN8nSecret } from "@/server/internal-auth";
import { loadReplyAction } from "@/server/outreach/reply-action";
import { runWebsiteAudit } from "@/server/audits/audit-engine";
import { serverEnv } from "@/server/env";
export const runtime="nodejs"; export const maxDuration=300;
const schema=z.object({id:z.string().uuid(),key:z.string().uuid()});
export async function POST(request:Request){
 const auth=requireN8nSecret(request);if(auth)return auth;
 try{
  const parsed=schema.safeParse(await request.json());if(!parsed.success)return apiError("Action ID and claim key are required.",422);
  let {lead}=await loadReplyAction(parsed.data.id,parsed.data.key);
  const {action}=await loadReplyAction(parsed.data.id,parsed.data.key);
  if(action.action==="report"&&(!lead.audit_report_url||lead.audit_status!=="audit_completed")){
   await runWebsiteAudit(lead.id,{replyReport:true});
   ({lead}=await loadReplyAction(parsed.data.id,parsed.data.key));
  }
  if(action.action==="report"&&(!lead.audit_report_url||lead.audit_status!=="audit_completed"||Number(lead.audit_confidence)<serverEnv.auditConfidenceThreshold))throw new Error("Report needs human review; no unverified report was sent.");
  const greeting=lead.contact_name&&lead.decision_maker_status==="verified"?`Hi ${String(lead.contact_name).trim().split(/\s+/)[0]},`:`Hello ${lead.company_name} team,`;
  const url=new URL(serverEnv.meetingBookingUrl);
  if(url.protocol!=="https:"||url.hostname!=="calendly.com")throw new Error("A valid HTTPS Calendly booking link is required.");
  url.searchParams.set("email",lead.email);if(lead.contact_name)url.searchParams.set("name",lead.contact_name);
  const body=action.action==="report"
   ?`${greeting}\n\nThanks for your reply. Attached is the short website report for ${lead.company_name}, with the verified findings and practical fixes.\n\nHave a look when convenient. If you'd like to discuss the recommendations, just let me know.\n\nBest regards,\nCode Nativex\ncodenativex.com`
   :`${greeting}\n\nThanks for your interest. We can walk you through your website and the recommendations on a 30-minute Google Meet call, with screen sharing.\n\nChoose a time that suits you here:\n${url.toString()}\n\nYour Google Meet details will arrive with the booking confirmation.\n\nBest regards,\nCode Nativex\ncodenativex.com`;
  return NextResponse.json({id:action.id,key:action.claim_key,leadId:lead.id,action:action.action,replyMessageId:lead.reply_message_id,threadId:lead.gmail_thread_id,body});
 }catch(error){return handleRouteError(error);}
}
