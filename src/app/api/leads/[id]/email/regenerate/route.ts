import { NextResponse } from "next/server";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { dispatchToN8n } from "@/server/n8n";
import { createSupabaseAdminClient } from "@/server/supabase-admin";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const admin = createSupabaseAdminClient();
    const { data: lead, error: readError } = await admin
      .from("lead_pipeline")
      .select("id, audit_status, audit_report_url, gmail_message_id")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw new Error(`Could not load the lead: ${readError.message}`);
    if (!lead) return apiError("Lead not found.", 404);
    if (lead.gmail_message_id) return apiError("A sent email cannot be regenerated.", 409);
    if (lead.audit_status !== "audit_completed" || !lead.audit_report_url) {
      return apiError("A completed evidence-based audit and PDF are required first.", 409);
    }
    const { error } = await admin.from("lead_pipeline").update({
      outreach_subject: null,
      outreach_body: null,
      email_preview_status: "pending_generation",
      human_review_required: true,
      outreach_approved_at: null,
      status: "email_draft_pending",
      outreach_status: "generating",
      next_action: "generate_evidence_email",
      next_workflow: "03 - Personalized Email Outreach",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw new Error(`Could not queue email regeneration: ${error.message}`);
    const dispatch = await dispatchToN8n("outreach", { leadIds: [id], mode: "draft_only", queuedBy: session.email });
    return NextResponse.json({ queued: true, dispatch });
  } catch (error) {
    return handleRouteError(error);
  }
}
