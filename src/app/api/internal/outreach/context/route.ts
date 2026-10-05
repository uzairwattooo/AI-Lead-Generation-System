import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handleRouteError } from "@/server/api";
import { evaluateAuditOutreachSafety } from "@/server/audits/audit-safety";
import { requireN8nSecret } from "@/server/internal-auth";
import { validateEvidenceDraft } from "@/server/outreach/draft-safety";
import { buildEvidenceEmailPrompt } from "@/server/outreach/email-template";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { serverEnv } from "@/server/env";
import type { AuditFinding } from "@/types";

const schema = z.object({ leadId: z.string().uuid(), mode: z.enum(["draft_only", "send_approved"]) });

export async function POST(request: Request) {
  const authError = requireN8nSecret(request);
  if (authError) return authError;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("A valid leadId and mode are required.", 422, parsed.error.issues);
    const admin = createSupabaseAdminClient();
    const { data: lead, error } = await admin.from("lead_pipeline").select("*").eq("id", parsed.data.leadId).maybeSingle();
    if (error) throw new Error(`Could not load outreach context: ${error.message}`);
    if (!lead) return apiError("Lead not found.", 404);
    const findings = Array.isArray(lead.audit_findings) ? lead.audit_findings as AuditFinding[] : [];
    const homepage = lead.audit_evidence?.homepage ?? {};
    const decision = evaluateAuditOutreachSafety({
      websiteIdentityVerified: lead.audit_status === "audit_completed",
      websiteIdentityConfidence: Number(lead.audit_confidence ?? 0),
      homepageFetched: homepage.fetched === true,
      analyzedUrlValid: Boolean(homepage.finalUrl),
      auditConfidence: Number(lead.audit_confidence ?? 0),
      confidenceThreshold: serverEnv.auditConfidenceThreshold,
      findings,
      email: lead.email,
      emailValidationStatus: lead.email_validation_status,
      doNotContact: lead.do_not_contact === true,
      duplicateCount: Number(lead.duplicate_count ?? 0),
      leadStatus: lead.status ?? "",
      approvalStatus: lead.approval_status ?? "",
      gmailMessageId: lead.gmail_message_id,
    });
    if (!decision.allowed || !lead.audit_report_url) return apiError(decision.reason ?? "Audit report is unavailable.", 409, { code: decision.code });

    const contactFirstName = lead.contact_name && lead.decision_maker_status === "verified" ? (String(lead.contact_name).trim().split(/\s+/)[0] ?? null) : null;
    if (parsed.data.mode === "draft_only") {
      return NextResponse.json({
        mode: parsed.data.mode,
        leadId: lead.id,
        recipientEmail: lead.email,
        companyName: lead.company_name,
        findings: findings.slice(0, 5),
        prompt: buildEvidenceEmailPrompt({ companyName: lead.company_name, contactFirstName, website: homepage.finalUrl ?? lead.website ?? "", service: lead.recommended_service ?? lead.service_interest ?? "", findings: findings.slice(0, 5) }),
      });
    }

    if (lead.email_preview_status !== "approved" || !lead.outreach_approved_at || !lead.outreach_subject || !lead.outreach_html_body) {
      return apiError("The evidence-based email draft has not been approved.", 409);
    }
    const draftErrors = validateEvidenceDraft({ subject: lead.outreach_subject, body: String(lead.outreach_plain_text_body || lead.outreach_body || "").split(/\n\nBest regards,/i)[0] || "", findingCodes: findings.slice(0, 2).map((finding) => finding.code), verifiedFindings: findings });
    // Old approved drafts may still contain the attachment/booking language. Require a fresh preview.
    if (draftErrors.some((message) => /First-touch|unresolved|unapproved/.test(message))) return apiError("Regenerate and approve the new first-touch email before sending.", 409);
    const sendKey = randomUUID();
    const { data: claimed, error: claimError } = await admin.from("lead_pipeline").update({ outreach_status: "sending", outreach_send_key: sendKey, updated_at: new Date().toISOString() }).eq("id", lead.id).eq("email_preview_status", "approved").is("gmail_message_id", null).neq("outreach_status", "sending").select("id").maybeSingle();
    if (claimError) throw new Error(`Could not claim outreach send: ${claimError.message}`);
    if (!claimed) return apiError("Duplicate send prevented: this lead is already sending or sent.", 409);
    return NextResponse.json({
      mode: parsed.data.mode,
      leadId: lead.id,
      sendKey,
      companyName: lead.company_name,
      website: homepage.finalUrl ?? lead.website ?? null,
      recipientEmail: lead.email,
      subject: lead.outreach_subject,
      html: lead.outreach_html_body,
      plainText: lead.outreach_plain_text_body,
      reportFilename: lead.audit_report_filename,
      auditStatus: lead.audit_status,
      auditScore: lead.audit_score,
      auditConfidence: lead.audit_confidence,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
