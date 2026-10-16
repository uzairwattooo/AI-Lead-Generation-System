import { NextResponse } from "next/server";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { prepareWebsiteDevelopment } from "@/server/outreach/prepare-website-development";
import { websiteMissing } from "@/server/outreach/website-development";
import { dispatchToN8n } from "@/server/n8n";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import {safeOperationalError} from "@/server/operations/policy";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const admin = createSupabaseAdminClient();
    const { data: lead, error: readError } = await admin
      .from("lead_pipeline")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw new Error(`Could not load the lead: ${readError.message}`);
    if (!lead) return apiError("Lead not found.", 404);
    if (lead.gmail_message_id||lead.first_outreach_at||lead.outreach_status==="sending"||lead.outreach_send_key||lead.dashboard_deleted_at) return apiError("A sent, claimed or deleted email cannot be regenerated.", 409);
    if(lead.approval_status!=="approved"||lead.do_not_contact)return apiError("An approved contactable lead is required.",409);
    if(lead.outreach_status==="generating"&&Date.now()-Date.parse(lead.updated_at)<300000)return apiError("A draft is already being generated.",409);
    if (websiteMissing(lead.website)) {
      const result=await prepareWebsiteDevelopment(id);
      return NextResponse.json({queued:false,dispatch:{dispatched:true,detail:result.blockReason||"Website development email regenerated. Review and approve it before sending."}});
    }
    if (lead.audit_status !== "audit_completed" || !lead.audit_report_url) {
      return apiError("A completed evidence-based audit and PDF are required first.", 409);
    }
    const { data:queued,error } = await admin.from("lead_pipeline").update({
      outreach_subject: null,
      outreach_body: null,
      outreach_include_concept: false,
      email_preview_status: "pending_generation",
      human_review_required: true,
      outreach_approved_at: null,
      status: "email_draft_pending",
      outreach_status: "generating",
      next_action: "generate_evidence_email",
      next_workflow: "03 - Personalized Email Outreach",
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("updated_at",lead.updated_at).is("gmail_message_id",null).is("first_outreach_at",null).neq("outreach_status","sending").is("dashboard_deleted_at",null).eq("approval_status","approved").eq("do_not_contact",false).select("id").maybeSingle();
    if (error) throw new Error(`Could not queue email regeneration: ${error.message}`);
    if(!queued)return apiError("Lead changed while preparing the draft. Refresh first.",409);
    try{
      const dispatch = await dispatchToN8n("outreach", { leadIds: [id], mode: "draft_only", queuedBy: session.email });
      if(!dispatch.dispatched)throw new Error(dispatch.detail);
      return NextResponse.json({ queued: true, dispatch });
    }catch(dispatchError){
      const {error:saveError}=await admin.from("lead_pipeline").update({outreach_status:"failed",status:"email_draft_failed",last_outreach_error:safeOperationalError(dispatchError instanceof Error?dispatchError.message:dispatchError),updated_at:new Date().toISOString()}).eq("id",id).eq("email_preview_status","pending_generation").eq("outreach_status","generating").is("gmail_message_id",null);
      if(saveError)throw new Error(saveError.message);throw dispatchError;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
