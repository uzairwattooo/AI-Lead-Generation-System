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
import { conceptEmail,usableEmail } from "@/server/lead-tools/policy";
import { renderProfessionalEmail } from "@/server/outreach/email-template";
import { websiteMissing,websiteDevelopmentEmail,developmentOutreachBlock } from "@/server/outreach/website-development";
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
    const developmentMode = lead.outreach_kind === "website_development" && lead.audit_status === "website_missing" && websiteMissing(lead.website);
    if(developmentMode){
      const block=developmentOutreachBlock(lead);if(block)return apiError(block,409);
      const {data:latestWebsite,error:websiteError}=await admin.from("lead_discovery_candidates").select("website,resolved_website").eq("lead_key",lead.lead_key).order("updated_at",{ascending:false}).limit(1).maybeSingle();
      if(websiteError)throw new Error(websiteError.message);
      if(!websiteMissing(latestWebsite?.website)||!websiteMissing(latestWebsite?.resolved_website))return apiError("A website was found after this draft. Regenerate the audit before sending.",409);
    }
    const visualMode = lead.outreach_include_concept === true && Boolean(lead.visual_concept_path && lead.visual_concept_job_id);
    if (visualMode && (lead.approval_status !== "approved" || lead.do_not_contact || lead.dashboard_deleted_at || lead.gmail_message_id || Number(lead.duplicate_count || 0) > 0 || !usableEmail(lead.email || ""))) return apiError("Concept email is blocked by approval/contact safety.",409);
    if (!visualMode && !developmentMode && (!decision.allowed || !lead.audit_report_url)) return apiError(decision.reason ?? "Audit report is unavailable.", 409, { code: decision.code });

    const contactFirstName = lead.contact_name && lead.decision_maker_status === "verified" ? (String(lead.contact_name).trim().split(/\s+/)[0] ?? null) : null;
    if (parsed.data.mode === "draft_only" && developmentMode) return apiError("Use dashboard Regenerate email to prepare the website development draft; no technical audit or AI generation is needed.",409);
    if (parsed.data.mode === "draft_only" && visualMode) return apiError("Use Prepare concept email after reviewing the generated image.",409);
    if (parsed.data.mode === "draft_only") {
      return NextResponse.json({
        mode: parsed.data.mode,
        leadId: lead.id,
        recipientEmail: lead.email,
        companyName: lead.company_name,
        findings: findings.slice(0, 5),
        prompt: buildEvidenceEmailPrompt({ companyName: lead.company_name, contactFirstName, website: homepage.finalUrl ?? lead.website ?? "", city: lead.city, industry: lead.industry, service: lead.recommended_service ?? lead.service_interest ?? "", findings: findings.slice(0, 5) }),
      });
    }

    if (lead.email_preview_status !== "approved" || !lead.outreach_approved_at || !lead.outreach_subject || !lead.outreach_html_body) {
      return apiError("The evidence-based email draft has not been approved.", 409);
    }
    const draftErrors = validateEvidenceDraft({ subject: lead.outreach_subject, body: String(lead.outreach_plain_text_body || lead.outreach_body || "").split(/\n\nBest regards,/i)[0] || "", findingCodes: findings.slice(0, 2).map((finding) => finding.code), verifiedFindings: findings });
    if (developmentMode) {
      const copy=websiteDevelopmentEmail(lead.company_name,lead.city,contactFirstName);
      const rendered=renderProfessionalEmail({companyName:lead.company_name,body:copy.body,findings:[]});
      if(lead.outreach_subject!==copy.subject||lead.outreach_plain_text_body!==rendered.plainText||lead.outreach_html_body!==rendered.html)return apiError("Regenerate and approve the website development email before sending.",409);
    }
    if (visualMode) {
      const copy = conceptEmail(lead.company_name,contactFirstName);
      const expected = renderProfessionalEmail({companyName:lead.company_name,body:copy.body,findings:[]});
      if (lead.outreach_subject !== copy.subject || lead.outreach_plain_text_body !== expected.plainText || lead.outreach_html_body !== expected.html) return apiError("Prepare and approve the latest concept email again.",409);
      const {data:job,error:jobError}=await admin.from("codenativex_lead_tool_jobs").select("target,status").eq("id",lead.visual_concept_job_id).eq("lead_id",lead.id).maybeSingle();
      if(jobError) throw new Error(jobError.message);
      if(!job || job.status!=="completed" || job.target.website!==lead.website) return apiError("Concept does not match the current website; regenerate it.",409);
    }
    // Old approved drafts may still contain the attachment/booking language. Require a fresh preview.
    if (!visualMode && !developmentMode && draftErrors.some((message) => /First-touch|unresolved|unapproved/.test(message))) return apiError("Regenerate and approve the new first-touch email before sending.", 409);
    const sendKey = randomUUID();
    const { data: claimed, error: claimError } = await admin.from("lead_pipeline").update({ outreach_status: "sending", outreach_send_key: sendKey, updated_at: new Date().toISOString() }).eq("id", lead.id).eq("email_preview_status", "approved").is("gmail_message_id", null).eq("approval_status","approved").eq("do_not_contact",false).is("dashboard_deleted_at",null).neq("outreach_status", "sending").select("id").maybeSingle();
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
      outreachKind: developmentMode ? "website_development" : "website_audit",
      includeConcept: visualMode,
      conceptJobId: visualMode ? lead.visual_concept_job_id : null,
      adminNotificationEmail: serverEnv.adminNotificationEmail,
      smtpFromEmail: serverEnv.smtpFromEmail,
      dashboardUrl: process.env.CODENATIVEX_ADMIN_DASHBOARD_URL || process.env.NEXT_PUBLIC_SITE_URL || "",
      reportFilename: lead.audit_report_filename,
      auditStatus: lead.audit_status,
      auditScore: lead.audit_score,
      auditConfidence: lead.audit_confidence,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
