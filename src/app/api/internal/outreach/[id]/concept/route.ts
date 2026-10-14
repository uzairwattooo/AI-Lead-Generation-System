import { NextResponse } from "next/server";
import { requireN8nSecret } from "@/server/internal-auth";
import { apiError,handleRouteError } from "@/server/api";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { downloadConcept } from "@/server/lead-tools/concept-download";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const auth=requireN8nSecret(request);if(auth)return auth;
 try {const {id}=await params;const admin=createSupabaseAdminClient();const {data:lead,error}=await admin.from("lead_pipeline").select("outreach_include_concept,email_preview_status,outreach_send_key,approval_status").eq("id",id).maybeSingle();if(error)throw new Error(error.message);
 if(!lead?.outreach_include_concept||lead.approval_status!=="approved"||lead.email_preview_status!=="approved"||lead.outreach_send_key!==new URL(request.url).searchParams.get("sendKey"))return apiError("Concept send is not authorized.",409);
 const data=await downloadConcept(id);return new NextResponse(data.bytes,{headers:{"content-type":"image/png","content-disposition":'attachment; filename="homepage-before-after.png"',"cache-control":"no-store"}}); }catch(error){return handleRouteError(error);}
}
