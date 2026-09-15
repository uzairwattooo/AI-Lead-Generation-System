import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handleRouteError } from "@/server/api";
import { requireN8nSecret } from "@/server/internal-auth";
import { createSupabaseAdminClient } from "@/server/supabase-admin";

const schema = z.object({ leadId: z.string().uuid(), sendKey: z.string().uuid(), outcome: z.enum(["sent", "failed"]), gmailMessageId: z.string().optional(), gmailThreadId: z.string().optional(), error: z.string().optional() });

export async function POST(request: Request) {
  const authError = requireN8nSecret(request);
  if (authError) return authError;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("The outreach result is invalid.", 422, parsed.error.issues);
    if (parsed.data.outcome === "sent" && !parsed.data.gmailMessageId) return apiError("Gmail message ID is required for a successful send.", 422);
    const now = new Date();
    const update = parsed.data.outcome === "sent" ? {
      status: "awaiting_reply", outreach_status: "sent", gmail_message_id: parsed.data.gmailMessageId, gmail_thread_id: parsed.data.gmailThreadId ?? parsed.data.gmailMessageId, first_outreach_at: now.toISOString(), last_outreach_at: now.toISOString(), next_follow_up_at: new Date(now.getTime() + 3 * 86_400_000).toISOString(), next_action: "monitor_reply", next_workflow: "04 - Reply Monitoring & Follow-Up", human_review_required: false, email_preview_status: "sent", last_outreach_error: null, updated_at: now.toISOString(),
    } : {
      status: "outreach_failed", outreach_status: "failed", next_action: "manual_review", next_workflow: null, human_review_required: true, last_outreach_error: parsed.data.error ?? "gmail_send_failed", updated_at: now.toISOString(),
    };
    const admin = createSupabaseAdminClient();
    let query = admin.from("lead_pipeline").update(update).eq("id", parsed.data.leadId).eq("outreach_send_key", parsed.data.sendKey);
    if (parsed.data.outcome === "sent") query = query.is("gmail_message_id", null);
    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw new Error(`Could not save outreach result: ${error.message}`);
    if (!data) return apiError("Outreach result was stale or already recorded.", 409);
    return NextResponse.json({ saved: true, status: update.status });
  } catch (error) {
    return handleRouteError(error);
  }
}
