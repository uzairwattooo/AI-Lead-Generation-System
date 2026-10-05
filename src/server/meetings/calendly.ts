export {validCalendlySignature} from "./calendly-signature";
import {createSupabaseAdminClient} from "@/server/supabase-admin";
import {serverEnv} from "@/server/env";
type Row=Record<string,unknown>;
const obj=(value:unknown):Row=>value&&typeof value==="object"&&!Array.isArray(value)?value as Row:{};
const str=(value:unknown)=>typeof value==="string"?value:"";
export async function calendlyGet(url:string):Promise<Row>{
 const parsed=new URL(url);
 if(parsed.protocol!=="https:"||parsed.hostname!=="api.calendly.com")throw new Error("Invalid Calendly API URL.");
 if(!serverEnv.calendlyApiToken)throw new Error("CALENDLY_API_TOKEN is not configured.");
 const response=await fetch(parsed,{headers:{Authorization:`Bearer ${serverEnv.calendlyApiToken}`},signal:AbortSignal.timeout(20000),cache:"no-store",redirect:"error"});
 if(!response.ok)throw new Error(`Calendly API returned ${response.status}.`);
 return obj(await response.json());
}
export async function persistCalendlyBooking(payload:Row,kind:string,event:Row,sourceAt:string){
 if(!serverEnv.calendlyEventTypeUri)throw new Error("CALENDLY_EVENT_TYPE_URI is required to restrict this integration to the 30-minute event.");
 if(str(event.event_type)!==serverEnv.calendlyEventTypeUri)return {ignored:true};
 const inviteeUri=str(payload.uri),email=str(payload.email).trim().toLowerCase();
 if(!inviteeUri||!email)throw new Error("Invitee URI and email are required.");
 const admin=createSupabaseAdminClient();
 const {data:leads,error}=await admin.from("lead_pipeline").select("id,company_name,contact_name").ilike("email",email).limit(2);
 if(error)throw new Error(error.message);
 // Ambiguous matches remain unbound for manual review; never choose the wrong lead.
 const lead=leads?.length===1?leads[0]:null;
 const location=obj(event.location);
 const candidateLink=str(location.join_url)||str(location.location);
 let meetingLink:string|null=null;
 try{const url=new URL(candidateLink);if(url.protocol==="https:"&&url.hostname==="meet.google.com")meetingLink=url.toString();}catch{}
 const cancelled=kind==="invitee.canceled"||str(payload.status)==="canceled"||str(event.status)==="canceled";
 const start=str(event.start_time),end=str(event.end_time);
 if(!cancelled&&(!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||Date.parse(end)<=Date.parse(start)))throw new Error("Booking start/end time is invalid.");
 const row={invitee_uri:inviteeUri,event_uri:str(event.uri)||str(payload.event),lead_id:lead?.id??null,company_name:lead?.company_name ?? (str(payload.name)||email),contact_name:str(payload.name)||(lead?.contact_name??null),client_email:email,meeting_status:cancelled?"cancelled":"scheduled",meeting_start_at:start||null,meeting_end_at:end||null,meeting_link:meetingLink,meeting_timezone:str(payload.timezone)||"UTC",source_event_at:sourceAt,updated_at:new Date().toISOString()};
 const {error:saveError}=await admin.rpc("codenativex_save_calendly_booking",{p_row:row});if(saveError)throw new Error(saveError.message);
 return {saved:true,matchedLead:Boolean(lead),googleMeetAvailable:Boolean(meetingLink)};
}
export {obj,str};
