import {NextResponse} from "next/server";
import {z} from "zod";
import {apiError,handleRouteError} from "@/server/api";
import {requireN8nSecret} from "@/server/internal-auth";
import {createSupabaseAdminClient} from "@/server/supabase-admin";
const schema=z.object({id:z.string().uuid(),key:z.string().uuid(),messageId:z.string().optional(),error:z.string().optional()});
export async function POST(request:Request){
 const auth=requireN8nSecret(request);if(auth)return auth;
 try{
  const p=schema.safeParse(await request.json());if(!p.success)return apiError("Invalid reply result.",422);
  const {data,error}=await createSupabaseAdminClient().rpc("codenativex_finish_reply_action",{p_id:p.data.id,p_key:p.data.key,p_message:p.data.messageId??"",p_error:p.data.error??(!p.data.messageId?"Gmail send result is ambiguous; check manually.":null)});
  if(error)throw new Error(error.message);if(!data)return apiError("Reply result does not match an active claim.",409);
  return NextResponse.json({saved:true});
 }catch(error){return handleRouteError(error);}
}
