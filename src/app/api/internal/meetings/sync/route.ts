import {NextResponse} from "next/server";
import {handleRouteError} from "@/server/api";
import {serverEnv} from "@/server/env";
import {requireN8nSecret} from "@/server/internal-auth";
import {calendlyGet,persistCalendlyBooking,obj,str} from "@/server/meetings/calendly";
export const maxDuration=300;
export async function POST(request:Request){
 const auth=requireN8nSecret(request);if(auth)return auth;
 try{
  const me=obj((await calendlyGet("https://api.calendly.com/users/me")).resource);
  const query=new URLSearchParams({user:str(me.uri),count:"100",min_start_time:new Date(Date.now()-30*86400000).toISOString(),max_start_time:new Date(Date.now()+90*86400000).toISOString()});
  let url:string|null=`https://api.calendly.com/scheduled_events?${query}`;let saved=0;
  // Bounded work per tick; use signed webhooks for real-time/high-volume updates.
  for(let page=0;url&&page<3;page++){
   const response=await calendlyGet(url);
   for(const rawEvent of Array.isArray(response.collection)?response.collection:[]){
    const event=obj(rawEvent);
    if (str(event.event_type) !== serverEnv.calendlyEventTypeUri) continue;
    let inviteesUrl:string|null=`${str(event.uri)}/invitees?count=100`;
    for(let ip=0;inviteesUrl&&ip<3;ip++){
     const invitees=await calendlyGet(inviteesUrl);
     for(const raw of Array.isArray(invitees.collection)?invitees.collection:[]){const payload=obj(raw);const result=await persistCalendlyBooking(payload,str(payload.status)==="canceled"?"invitee.canceled":"invitee.created",event,str(payload.updated_at)||str(event.updated_at)||new Date().toISOString());if(result.saved)saved++;}
     inviteesUrl=str(obj(invitees.pagination).next_page)||null;
    }
   }
   url=str(obj(response.pagination).next_page)||null;
  }
  return NextResponse.json({saved,pollingWindow:"last 30 / next 90 days"});
 }catch(error){return handleRouteError(error);}
}
