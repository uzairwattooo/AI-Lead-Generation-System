import type { Lead } from "@/types";

export function leadProgress(lead: Lead): { label: string; active: boolean; tone: "neutral" | "info" | "success" | "warning" | "danger" } {
  if (lead.approvalStatus === "rejected") return { label: "Rejected", active: false, tone: "danger" };
  if (["outreach_failed", "outreach_blocked", "needs_human_review"].includes(lead.outreachStatus) || ["audit_failed", "audit_needs_review"].includes(lead.auditStatus)) return { label: lead.auditBlockReason || "Needs attention", active: false, tone: "danger" };
  if (["initial_email_sent", "awaiting_reply", "follow_up_1", "follow_up_2", "follow_up_3"].includes(lead.outreachStatus)) return { label: "Email sent · Waiting for reply", active: false, tone: "success" };
  if (["replied", "interested", "meeting_booked", "not_interested", "do_not_contact"].includes(lead.outreachStatus)) return { label: lead.outreachStatus.replaceAll("_", " "), active: false, tone: "success" };
  if (lead.rawOutreachStatus === "sending") return { label: "Processing · Sending email", active: true, tone: "info" };
  if (lead.emailPreviewStatus === "approved" || lead.outreachStatus === "queued") return { label: "Email queued for sending", active: false, tone: "info" };
  if (["awaiting_approval", "email_draft_ready"].includes(lead.outreachStatus) || lead.emailPreviewStatus === "awaiting_approval") return { label: "Draft ready · Approve email", active: false, tone: "warning" };
  if (lead.auditStatus === "audit_processing") return { label: "Processing · Website audit", active: true, tone: "info" };
  if (lead.auditStatus === "audit_pending") return { label: "Queued · Waiting for audit", active: false, tone: "info" };
  if (lead.emailPreviewStatus === "pending_generation" || lead.rawOutreachStatus === "generating") return { label: "Queued · Waiting for email draft", active: false, tone: "info" };
  if (lead.processingStatus === "email_draft_processing" || lead.processingStatus === "outreach_processing") return { label: "Processing · Email draft", active: true, tone: "info" };
  if (lead.auditStatus === "audit_completed" && lead.lastAction === "outreach_prepared") return { label: "Audit complete · Waiting for email draft", active: false, tone: "info" };
  if (lead.approvalStatus === "approved") return { label: "Approved · Not prepared", active: false, tone: "neutral" };
  return { label: "Pending review", active: false, tone: "neutral" };
}
