import { after, NextResponse } from "next/server";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { runWebsiteAudit } from "@/server/audits/audit-engine";
export const maxDuration=300;
import { createSupabaseAdminClient } from "@/server/supabase-admin";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const admin = createSupabaseAdminClient();
    const {data:current,error:currentError}=await admin.from("lead_pipeline").select("id,audit_status,updated_at").eq("id",id).maybeSingle();
    if(currentError)throw new Error(currentError.message);
    if(!current)return apiError("Lead not found.",404);
    if(["audit_pending","audit_processing"].includes(current.audit_status)&&Date.now()-Date.parse(current.updated_at)<300000)return NextResponse.json({queued:true,existing:true},{status:202});
    const { data, error } = await admin
      .from("lead_pipeline")
      .update({
        audit_status: "audit_pending",
        audit_error_code: null,
        audit_error_message: null,
        email_preview_status: null,
        outreach_approved_at: null,
        status: "audit_pending",
        next_action: "run_verified_website_audit",
        next_workflow: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("updated_at",current.updated_at)
      .is("gmail_message_id", null)
      .is("dashboard_deleted_at",null)
      .neq("outreach_status","sending")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Could not queue a fresh audit: ${error.message}`);
    if (!data) return apiError("The lead was not found or has already been sent.", 409);
    after(async()=>{
      try{await runWebsiteAudit(id);}catch(error){await admin.from("lead_pipeline").update({audit_status:"audit_failed",audit_error_code:"AUDIT_WORKER_FAILED",audit_error_message:error instanceof Error?error.message:"Audit worker failed.",updated_at:new Date().toISOString()}).eq("id",id).in("audit_status",["audit_processing","audit_pending"]);}
    });
    return NextResponse.json({queued:true},{status:202});
  } catch (error) {
    return handleRouteError(error);
  }
}
