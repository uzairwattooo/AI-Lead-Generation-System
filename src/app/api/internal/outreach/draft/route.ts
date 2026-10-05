import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handleRouteError } from "@/server/api";
import { requireN8nSecret } from "@/server/internal-auth";
import { validateEvidenceDraft } from "@/server/outreach/draft-safety";
import { renderProfessionalEmail } from "@/server/outreach/email-template";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import type { AuditFinding, AuditScores } from "@/types";

const schema = z.object({ leadId: z.string().uuid(), subject: z.string().min(1), body: z.string().min(1), findingCodes: z.array(z.string()).min(1).max(2) });

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function score(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function auditScores(value: unknown): AuditScores {
  const pagespeed = record(record(value).pagespeed);
  const mobile = record(record(pagespeed.mobile).scores);
  const desktop = record(record(pagespeed.desktop).scores);
  return {
    performanceMobile: score(mobile.performance),
    performanceDesktop: score(desktop.performance),
    seo: score(mobile.seo) ?? score(desktop.seo),
    accessibility: score(mobile.accessibility) ?? score(desktop.accessibility),
    bestPractices: score(mobile.bestPractices) ?? score(desktop.bestPractices),
  };
}

export async function POST(request: Request) {
  const authError = requireN8nSecret(request);
  if (authError) return authError;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("The generated email draft is invalid.", 422, parsed.error.issues);
    const admin = createSupabaseAdminClient();
    const { data: lead, error } = await admin.from("lead_pipeline").select("company_name, audit_status, audit_findings, audit_evidence, audit_report_url, audit_report_filename, gmail_message_id").eq("id", parsed.data.leadId).maybeSingle();
    if (error) throw new Error(`Could not load draft context: ${error.message}`);
    if (!lead) return apiError("Lead not found.", 404);
    if (lead.gmail_message_id) return apiError("Duplicate send prevented: this lead was already contacted.", 409);
    if (lead.audit_status !== "audit_completed" || !lead.audit_report_url) return apiError("A completed verified audit is required.", 409);
    const findings = Array.isArray(lead.audit_findings) ? lead.audit_findings as AuditFinding[] : [];
    const errors = validateEvidenceDraft({ subject: parsed.data.subject, body: parsed.data.body, findingCodes: parsed.data.findingCodes, verifiedFindings: findings });
    if (errors.length) return apiError("The draft contains unsafe or unsupported content.", 422, errors);
    const selected = findings.filter((finding) => parsed.data.findingCodes.includes(finding.code));
    const rendered = renderProfessionalEmail({
      body: parsed.data.body,
      companyName: lead.company_name,
      findings: selected,
      scores: auditScores(lead.audit_evidence),
      reportFilename: lead.audit_report_filename,
    });
    const { error: updateError } = await admin.from("lead_pipeline").update({ outreach_subject: parsed.data.subject.trim(), outreach_body: rendered.plainText, outreach_html_body: rendered.html, outreach_plain_text_body: rendered.plainText, email_preview_status: "awaiting_approval", human_review_required: true, outreach_approved_at: null, outreach_status: "awaiting_approval", status: "email_draft_ready", next_action: "review_email", next_workflow: null, last_outreach_error: null, updated_at: new Date().toISOString() }).eq("id", parsed.data.leadId);
    if (updateError) throw new Error(`Could not save email preview: ${updateError.message}`);
    return NextResponse.json({ saved: true, status: "awaiting_approval" });
  } catch (error) {
    return handleRouteError(error);
  }
}
