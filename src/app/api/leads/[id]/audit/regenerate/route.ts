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
    const { data, error } = await admin
      .from("lead_pipeline")
      .update({
        audit_status: "audit_pending",
        audit_error_code: null,
        audit_error_message: null,
        email_preview_status: null,
        status: "audit_pending",
        next_action: "run_verified_website_audit",
        next_workflow: "02A - Website Audit & Branded Report Generator",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("gmail_message_id", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Could not queue a fresh audit: ${error.message}`);
    if (!data) return apiError("The lead was not found or has already been sent.", 409);
    const dispatch = await dispatchToN8n("audit", { leadIds: [id], mode: "audit_and_prepare_draft", queuedBy: session.email });
    return NextResponse.json({ queued: true, dispatch });
  } catch (error) {
    return handleRouteError(error);
  }
}
