import {NextResponse} from "next/server";
import {apiError,handleRouteError} from "@/server/api";
import {serverEnv} from "@/server/env";
import {validCalendlySignature,calendlyGet,persistCalendlyBooking,obj,str} from "@/server/meetings/calendly";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const raw=await request.text();
  if(!validCalendlySignature(raw,request.headers.get("calendly-webhook-signature")??"",serverEnv.calendlyWebhookSigningKey))return apiError("Invalid Calendly webhook signature.",401);
  const envelope=obj(JSON.parse(raw)),kind=str(envelope.event);
  if(!["invitee.created","invitee.canceled"].includes(kind))return NextResponse.json({ignored:true});
  const payload=obj(envelope.payload);
  const event=obj((await calendlyGet(str(payload.event))).resource);
  const sourceAt=str(envelope.created_at);if(!Number.isFinite(Date.parse(sourceAt)))return apiError("Invalid event timestamp.",422);
  return NextResponse.json(await persistCalendlyBooking(payload,kind,event,sourceAt));
 }catch(error){return handleRouteError(error);}
}
