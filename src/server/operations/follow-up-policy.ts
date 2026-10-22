/** Initial-send locks must not be removed to recover a generation-only follow-up failure. */
export const FOLLOW_UP_WORKFLOW = "04 - Reply Monitoring & Follow-Up";
export function followUpRetryBlockReason(lead: Record<string, unknown>, now = Date.now()): string | null {
  if (lead.dashboard_deleted_at || lead.do_not_contact !== false || lead.approval_status !== "approved")
    return "This lead must be approved, active and allowed to contact.";
  if (lead.reply_received_at || (lead.reply_status && !["pending", "not_received", "awaiting_reply", "none", "no_reply", "not_replied"].includes(String(lead.reply_status))))
    return "A reply or delivery issue is recorded. Review it before any follow-up.";
  if (lead.status !== "follow_up_failed" || lead.outreach_status !== "failed")
    return "Only a stopped follow-up generation failure can be retried here.";
  const error = String(lead.last_outreach_error || "");
  if (!/^follow_up_generation_attempt=\d+;\s*(?:model_error\b|ai_json_parse_failed\b|missing_body\b|invalid_word_count\b|invalid_ai_json_or_body_schema\b)/i.test(error)
    || /smtp|send_failed|ambiguous|manual_review_required|stale_follow_up/i.test(error))
    return "This is not a confirmed generation-only failure. Check SMTP logs before retrying.";
  if (!lead.first_outreach_at || !Number.isFinite(Date.parse(String(lead.first_outreach_at))) || !lead.gmail_message_id || !lead.gmail_thread_id || !lead.outreach_id)
    return "The earlier send receipt or follow-up claim is missing. Review send history first.";
  if (lead.email_validation_status !== "syntax_valid" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(lead.email || "")))
    return "A valid previously contacted email address is required.";
  if (lead.outreach_kind === "website_development" || lead.audit_status === "website_missing")
    return "The website-development follow-up sequence is not enabled in workflow 04.";
  const count = Number(lead.follow_up_count), attempts = Number(lead.outreach_attempts);
  if (!Number.isInteger(count) || count < 0 || count >= 3 || !Number.isInteger(attempts) || attempts !== count + 1)
    return "Send counters need review, or this follow-up sequence is complete.";
  if (now - Date.parse(String(lead.dashboard_retry_at || "")) < 120000)
    return "A retry was recently queued. Wait two minutes and refresh.";
  return null;
}
