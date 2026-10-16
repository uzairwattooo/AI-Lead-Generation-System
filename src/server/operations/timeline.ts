import type {ActivityEvent} from "@/types";
import {safeOperationalError} from "./policy";
export function storedMilestones(lead:Record<string,unknown>):ActivityEvent[]{
 const fields=[['created_at','Lead discovered'],['audit_generated_at','Audit result saved'],['outreach_approved_at','Email approved'],['first_outreach_at','Initial email sent'],['reply_received_at','Reply received'],['admin_notification_sent_at','Admin notification sent']] as const;
 return fields.flatMap(([field,label])=>{
  const at=lead[field];if(typeof at!=="string"||!Number.isFinite(Date.parse(at)))return [];
  return [{id:`stored-${lead.id}-${field}`,leadId:String(lead.id),requestId:null,actor:"system" as const,action:`stored.${field}`,message:`${label} · stored timestamp`,severity:"info" as const,createdAt:at}];
 });
}
export function mergeTimeline(events:ActivityEvent[]){
 return [...new Map(events.map(e=>[e.id,{...e,message:safeOperationalError(e.message)}])).values()].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,100);
}
