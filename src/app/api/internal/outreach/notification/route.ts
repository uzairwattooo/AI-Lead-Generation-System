import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError,handleRouteError } from "@/server/api";
import { requireN8nSecret } from "@/server/internal-auth";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
const schema=z.object({leadId:z.string().uuid(),sendKey:z.string().uuid(),adminNotificationStatus:z.enum(["sent","failed","skipped"]),adminNotificationMessageId:z.string().optional(),adminNotificationError:z.string().optional()});
export async function POST(request:Request) {
 const auth=requireN8nSecret(request);if(auth)return auth;
 try {const body=schema.safeParse(await request.json());if(!body.success)return apiError("Invalid notification receipt.",422);const input=body.data;if(input.adminNotificationStatus==="sent"&&!input.adminNotificationMessageId)return apiError("SMTP message ID required.",422);
 const {data,error}=await createSupabaseAdminClient().from("lead_pipeline").update({admin_notification_status:input.adminNotificationStatus,admin_notification_error:input.adminNotificationStatus==="sent"?null:input.adminNotificationError||"Admin notification was not sent; check recipient and SMTP execution.",admin_notification_sent_at:input.adminNotificationStatus==="sent"?new Date().toISOString():null}).eq("id",input.leadId).eq("outreach_send_key",input.sendKey).not("gmail_message_id","is",null).select("id").maybeSingle();if(error)throw new Error(error.message);if(!data)return apiError("Stale notification receipt.",409);return NextResponse.json({saved:true}); }catch(error){return handleRouteError(error);}
}
