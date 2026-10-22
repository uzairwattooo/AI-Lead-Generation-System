import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FOLLOW_UP_WORKFLOW, followUpRetryBlockReason } from "./follow-up-policy";

export async function claimFollowUpRetry(lead: Record<string, unknown>, admin: SupabaseClient) {
  const reason = followUpRetryBlockReason(lead);
  if (reason) throw new Error(reason);
  // The exact failed claim must have terminated before SMTP. Never infer this from the UI label alone.
  const { data: events, error } = await admin.from("lead_outreach_events")
    .select("outcome,message_id,sequence_no,outreach_id")
    .eq("lead_id", lead.id).eq("outreach_id", lead.outreach_id).limit(100);
  if (error) throw new Error(`Could not verify follow-up history: ${error.message}`);
  if (!events?.length || !events.some(e => e.outcome === "follow_up_generation_failed")
    || events.some(e => e.outcome !== "follow_up_generation_failed"))
    throw new Error("The failed claim is not confirmed as generation-only. Review SMTP and event history; no retry was queued.");
  // A legacy workflow could increment counters even when generation failed. Do not silently skip or repeat a stage.
  const { data: receipts, error: receiptError } = await admin.from("lead_outreach_events")
    .select("message_id,sequence_no").eq("lead_id", lead.id).eq("outcome", "follow_up_sent").limit(100);
  if (receiptError) throw new Error(`Could not verify sent follow-ups: ${receiptError.message}`);
  const sent = new Map<string, number>();
  for (const receipt of receipts || []) {
    if (!receipt.message_id || !Number.isInteger(Number(receipt.sequence_no)))
      throw new Error("A sent follow-up receipt is incomplete. Review history before retrying.");
    const message = String(receipt.message_id), sequence = Number(receipt.sequence_no);
    if (sent.has(message) && sent.get(message) !== sequence)
      throw new Error("Send history has conflicting sequence numbers. Review it before retrying.");
    sent.set(message, sequence);
  }
  const count = Number(lead.follow_up_count);
  const sequences = [...sent.values()].sort((a, b) => a - b);
  if (sent.size !== count || sequences.some((sequence, index) => sequence !== index + 2)
    || (count > 0 && sent.get(String(lead.gmail_message_id)) !== count + 1)
    || (count > 0 && !lead.last_follow_up_at) || (count === 0 && lead.last_follow_up_at))
    throw new Error("Stored counters do not match confirmed sent follow-ups. Manual history review is required; the initial email was not reset.");
  const now = new Date().toISOString();
  const nextFollowUpAt = new Date(Date.now() + 60000).toISOString();
  let update = admin.from("lead_pipeline").update({
    status: "awaiting_reply", outreach_status: "follow_up_generation_retry",
    next_workflow: FOLLOW_UP_WORKFLOW, next_follow_up_at: nextFollowUpAt,
    last_outreach_error: null, // Clear only the failed generation marker; workflow 04 starts a fresh generation attempt.
    dashboard_retry_key: randomUUID(), dashboard_retry_at: now, updated_at: now,
  }).eq("id", lead.id).eq("updated_at", lead.updated_at)
    .eq("status", "follow_up_failed").eq("outreach_status", "failed")
    .eq("outreach_id", lead.outreach_id).eq("last_outreach_error", lead.last_outreach_error)
    .eq("email", lead.email).eq("email_validation_status", "syntax_valid")
    .eq("approval_status", "approved").eq("do_not_contact", false)
    .eq("gmail_message_id", lead.gmail_message_id).eq("gmail_thread_id", lead.gmail_thread_id)
    .eq("first_outreach_at", lead.first_outreach_at)
    .eq("follow_up_count", count).eq("outreach_attempts", Number(lead.outreach_attempts))
    .is("reply_received_at", null).is("dashboard_deleted_at", null);
  update = lead.reply_status == null ? update.is("reply_status", null) : update.eq("reply_status", lead.reply_status);
  const { data, error: updateError } = await update.select("id").maybeSingle();
  if (updateError) throw new Error(updateError.message);
  return data?.id === lead.id ? { queued: true, nextFollowUpAt } : null;
}
