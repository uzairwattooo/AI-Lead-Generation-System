import {NextResponse} from "next/server";
import {z} from "zod";
import {apiError,handleRouteError} from "@/server/api";
import {requireN8nSecret} from "@/server/internal-auth";
import {createSupabaseAdminClient} from "@/server/supabase-admin";
const schema=z.object({id:z.string().uuid(),key:z.string().uuid(),messageId:z.string().optional(),error:z.string().optional()});
export async function POST(request:Request){
 const auth=requireN8nSecret(request);if(auth)return auth;
 try{
  const p=schema.safeParse(await request.json());if(!p.success)return apiError("Invalid handoff result.",422);
  const {data,error}=await createSupabaseAdminClient().from("codenativex_calendly_bookings").update({handoff_status:p.data.messageId&&!p.data.error?"sent":"needs_review"}).eq("id",p.data.id).eq("handoff_key",p.data.key).eq("handoff_status","sending").select("id").maybeSingle();
  if(error)throw new Error(error.message);if(!data)return apiError("Handoff claim is not active.",409);
  return NextResponse.json({saved:true});
 }catch(error){return handleRouteError(error);}
}
