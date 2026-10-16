import {NextResponse} from "next/server";
import {z} from "zod";
import {apiError,handleRouteError,requireSession} from "@/server/api";
import {isDemoMode} from "@/server/env";
import {createSupabaseAdminClient} from "@/server/supabase-admin";
import {retryOptions} from "@/server/operations/policy";
import {dispatchApprovedOutreach} from "@/server/operations/outreach-dispatch";
import {claimOutreachRetry} from "@/server/operations/outreach-retry";
import {POST as audit} from "../audit/regenerate/route";
import {POST as draft} from "../email/regenerate/route";
import {POST as tool} from "../tools/route";
import {POST as conceptDraft} from "../concept-email/route";
export const maxDuration=300;
export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 const auth=await requireSession();if(!auth.ok)return auth.response;
 if(isDemoMode())return apiError("Live retries are unavailable in demo mode.",409);
 try{
  const input=z.object({kind:z.enum(["audit","email_draft","outreach","contacts","concept"])}).strict().safeParse(await request.json());if(!input.success)return apiError("Choose a valid retry action.",422);
  const {id}=await context.params;const admin=createSupabaseAdminClient();
  const {data:lead,error}=await admin.from("lead_pipeline").select("*").eq("id",id).maybeSingle();if(error)throw new Error(error.message);
  if(!lead&&input.data.kind==="contacts")return tool(new Request(request.url,{method:"POST",headers:request.headers,body:JSON.stringify({kind:"contacts"})}),context);
  if(!lead)return apiError("Prepare this lead for outreach first.",409);
  const option=retryOptions(lead).find(x=>x.kind===input.data.kind)!;if(!option.allowed)return apiError(option.reason||"Retry blocked.",409);
  if(input.data.kind==="audit")return audit(request,context);
  if(input.data.kind==="email_draft")return lead.outreach_include_concept&&lead.visual_concept_path?conceptDraft(request,context):draft(request,context);
  if(input.data.kind==="concept"||input.data.kind==="contacts")return tool(new Request(request.url,{method:"POST",headers:request.headers,body:JSON.stringify({kind:input.data.kind})}),context);
  if(!await claimOutreachRetry(lead,admin))return apiError("Lead changed or another retry started. Refresh before retrying.",409);
  const dispatch=await dispatchApprovedOutreach(id,{leadIds:[id],mode:"send_approved",approvedBy:auth.email});
  return NextResponse.json({queued:true,dispatch,detail:"Approved email dispatched. Sending remains guarded against duplicates."});
 }catch(e){return handleRouteError(e);}
}
