import { followUpRetryBlockReason } from "./follow-up-policy";
export type RetryKind = "audit" | "email_draft" | "outreach" | "contacts" | "concept" | "follow_up";
export type RetryOption = {kind:RetryKind;label:string;allowed:boolean;reason:string|null};
export function retryOptions(lead:Record<string,unknown>,now=Date.now()):RetryOption[]{
 const sent=Boolean(lead.gmail_message_id||lead.first_outreach_at);
 const locked=sent||lead.outreach_status==="sending"||Boolean(lead.outreach_send_key);
 const restricted=lead.dashboard_deleted_at||lead.do_not_contact===true||lead.approval_status==="rejected";
 const contact=!lead.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(lead.email));
 const approved=lead.approval_status==="approved";
 const cooling=now-Date.parse(String(lead.dashboard_retry_at||""))<120000;
 const recentlyQueued=now-Date.parse(String(lead.outreach_approved_at||""))<120000&&!lead.last_outreach_error;
 const busyAudit=["audit_pending","audit_processing"].includes(String(lead.audit_status))&&now-Date.parse(String(lead.updated_at))<300000;
 const busyDraft=(lead.outreach_status==="generating"||lead.email_preview_status==="pending_generation")&&now-Date.parse(String(lead.updated_at))<300000;
 const common=restricted?"This lead is deleted, rejected or marked do not contact.":locked?"A send is already recorded or claimed. Check SMTP logs; retry is blocked to prevent duplicates.":null;
 const reasons:Record<RetryKind,string|null>={
  follow_up:followUpRetryBlockReason(lead,now),
  audit:common||(!approved?"Approve the lead first.":busyAudit?"An audit is already queued or processing.":null),
  email_draft:common||(!approved?"Approve the lead first.":contact?"A valid email address is required.":busyDraft?"A draft is already being generated.":null),
  outreach:common||(!approved?"Approve the lead first.":contact?"A valid email address is required.":lead.email_preview_status!=="approved"||!lead.outreach_approved_at?"Review and approve the email first.":cooling||recentlyQueued?"A dispatch was recently attempted. Wait two minutes and refresh.":!["queued","failed"].includes(String(lead.outreach_status))?"Only an approved queued or failed dispatch can be retried.":null),
  contacts:common,
  concept:common||(!approved?"Approve the lead first.":!lead.website?"A website URL is required.":null),
 };
 const labels:Record<RetryKind,string>={audit:"Retry audit",email_draft:"Prepare draft again",outreach:"Retry approved send",contacts:"Retry contact search",concept:"Generate concept again",follow_up:"Retry failed follow-up"};
 return (Object.keys(labels) as RetryKind[]).map(kind=>({kind,label:labels[kind],allowed:!reasons[kind],reason:reasons[kind]}));
}
export function safeOperationalError(value:unknown){
 return String(value||"").replace(/([?&](?:token|key|api_key|secret)=)[^\s&"']+/gi,"$1[redacted]").replace(/Bearer\s+\S+/gi,"Bearer [redacted]").slice(0,1200);
}
export function costEstimate(usage:{audits:number;contacts:number;concepts:number},rates:{audit_usd:number|string|null;contacts_usd:number|string|null;concept_usd:number|string|null}){
 const entries=[[usage.audits,rates.audit_usd],[usage.contacts,rates.contacts_usd],[usage.concepts,rates.concept_usd]];
 const configured=entries.every(([,r])=>r!==null&&r!==undefined&&Number.isFinite(Number(r))&&Number(r)>=0);
 return {configured,estimatedUsd:configured?entries.reduce((sum,[count,rate])=>sum+Number(count)*Number(rate),0):null};
}

