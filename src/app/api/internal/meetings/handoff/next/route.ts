import {NextResponse} from "next/server";
import {handleRouteError} from "@/server/api";
import {requireN8nSecret} from "@/server/internal-auth";
import {createSupabaseAdminClient} from "@/server/supabase-admin";
import {serverEnv} from "@/server/env";
export async function POST(request:Request){
 const auth=requireN8nSecret(request);if(auth)return auth;
 try{
  const email=process.env.CODENATIVEX_ADMIN_NOTIFICATION_EMAIL||serverEnv.contactEmail;
  if(!email)return NextResponse.json({handoff:null});
  const {data,error}=await createSupabaseAdminClient().rpc("codenativex_claim_meeting_handoff");if(error)throw new Error(error.message);
  const b=data?.[0];if(!b)return NextResponse.json({handoff:null});
  const start=new Date(b.meeting_start_at).toLocaleString("en-GB",{timeZone:b.meeting_timezone||"UTC"});
  return NextResponse.json({handoff:{id:b.id,key:b.handoff_key,email,subject:`Meeting booked: ${b.company_name}`,body:`A 30-minute meeting was booked through Calendly.\n\nBusiness: ${b.company_name}\nContact: ${b.contact_name||b.client_email}\nEmail: ${b.client_email}\nTime: ${start} (${b.meeting_timezone||"UTC"})\nGoogle Meet: ${b.meeting_link||"Pending: check Calendly conferencing settings"}\n\nDashboard: ${process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"}/dashboard/meetings`}});
 }catch(error){return handleRouteError(error);}
}
