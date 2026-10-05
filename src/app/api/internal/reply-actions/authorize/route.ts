import { NextResponse } from "next/server";
import { z } from "zod";
import {apiError,handleRouteError} from "@/server/api";
import {requireN8nSecret} from "@/server/internal-auth";
import {loadReplyAction} from "@/server/outreach/reply-action";
const schema=z.object({id:z.string().uuid(),key:z.string().uuid()});
export async function POST(request:Request){
 const auth=requireN8nSecret(request);if(auth)return auth;
 try{
  const p=schema.safeParse(await request.json());if(!p.success)return apiError("Invalid action claim.",422);
  const {admin,action}=await loadReplyAction(p.data.id,p.data.key);
  const {data,error}=await admin.from("codenativex_reply_actions").update({status:"sending"}).eq("id",action.id).eq("claim_key",p.data.key).eq("status","processing").select("id").maybeSingle();
  if(error)throw new Error(error.message);if(!data)return apiError("Duplicate reply send prevented.",409);
  return NextResponse.json({authorized:true});
 }catch(error){return handleRouteError(error);}
}
