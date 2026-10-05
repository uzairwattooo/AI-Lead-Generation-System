import { NextResponse } from "next/server";
import { handleRouteError } from "@/server/api";
import { requireN8nSecret } from "@/server/internal-auth";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
export async function POST(request: Request) {
 const auth = requireN8nSecret(request); if (auth) return auth;
 try {
  const admin = createSupabaseAdminClient();
  const {data: leads,error} = await admin.from("lead_pipeline").select("id,status,reply_message_id").in("status",["report_requested","meeting_requested"]).eq("next_workflow","05 - Meeting Booking & Sales Handoff").eq("do_not_contact",false).order("updated_at").limit(50);
  if(error) throw new Error(error.message);
  const rows = (leads ?? []).filter(l=>l.reply_message_id).map(l=>({lead_id:l.id,reply_message_id:l.reply_message_id,action:l.status==="report_requested"?"report":"booking"}));
  if(rows.length) {
   const {error:e} = await admin.from("codenativex_reply_actions").upsert(rows,{onConflict:"lead_id,reply_message_id",ignoreDuplicates:true});
   if(e) throw new Error(e.message);
  }
  const {data,error:e} = await admin.rpc("codenativex_claim_reply_action"); if(e) throw new Error(e.message);
  return NextResponse.json({action:data?.[0]??null});
 }catch(error){return handleRouteError(error);}
}
