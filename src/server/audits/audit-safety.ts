import type { AuditFinding, AuditStatus } from "@/types";

export interface AuditSafetyInput {
  websiteIdentityVerified: boolean;
  homepageError?: string | null;
  nonBusinessWebsite?: boolean;
  websiteIdentityConfidence: number;
  homepageFetched: boolean;
  analyzedUrlValid: boolean;
  auditConfidence: number;
  confidenceThreshold: number;
  findings: AuditFinding[];
  email: string | null;
  emailValidationStatus: string | null;
  doNotContact: boolean;
  duplicateCount: number;
  leadStatus: string;
  approvalStatus: string;
  gmailMessageId?: string | null;
}

export interface AuditSafetyDecision {
  allowed: boolean;
  status: AuditStatus;
  code: string | null;
  reason: string | null;
}

const ACCEPTABLE_EMAIL_STATUSES = new Set([
  "syntax_valid",
  "deliverable",
  "verified",
  "valid",
]);

export function evaluateAuditOutreachSafety(input: AuditSafetyInput): AuditSafetyDecision {
  const block = (code: string, reason: string, failed = false): AuditSafetyDecision => ({
    allowed: false,
    status: failed ? "audit_failed" : "audit_needs_review",
    code,
    reason,
  });

  if(input.nonBusinessWebsite) return block("NON_BUSINESS_WEBSITE_URL","The saved URL is an email provider, directory or unrelated portal; confirm the business website.");
  if (!input.analyzedUrlValid) return block("INVALID_AUDIT_URL", "The analyzed website URL is invalid.", true);
  if (!input.homepageFetched) {
    const error=input.homepageError||"";
    const blocked=/HTTP_(401|403|429)|BOT_CHALLENGE|BROWSER_ACCESS_BLOCKED/.test(error);
    return block(blocked?"AUDIT_ACCESS_BLOCKED":"WEBSITE_FETCH_FAILED",blocked?"Automated audit access was blocked or rate limited. No website defect is inferred.":`The homepage could not be fetched${error?` (${error})`:""}.`,true);
  }
  if (!input.websiteIdentityVerified) return block("WEBSITE_IDENTITY_NOT_VERIFIED", "The fetched website could not be matched to the business name and contact/location evidence.");
  if (input.websiteIdentityConfidence < input.confidenceThreshold) return block("LOW_WEBSITE_IDENTITY_CONFIDENCE",`Website identity confidence ${input.websiteIdentityConfidence} is below the required ${input.confidenceThreshold}.`);
  if (input.findings.length === 0) {
    return block("NO_VERIFIED_FINDINGS", "The audit did not produce any verified findings.");
  }
  if (input.auditConfidence < input.confidenceThreshold) {
    return block(
      "LOW_AUDIT_CONFIDENCE",
      `Audit confidence ${input.auditConfidence} is below the required ${input.confidenceThreshold}.`,
    );
  }
  if (!input.email || !ACCEPTABLE_EMAIL_STATUSES.has((input.emailValidationStatus ?? "").toLowerCase())) {
    return block("EMAIL_NOT_ACCEPTABLE", "A verified or syntax-valid email address is required.");
  }
  if (input.doNotContact) return block("DO_NOT_CONTACT", "This lead is marked do-not-contact.");
  if (input.duplicateCount > 0 || input.leadStatus.toLowerCase().includes("duplicate")) {
    return block("DUPLICATE_LEAD", "This lead is marked as a duplicate.");
  }
  if (input.approvalStatus.toLowerCase() === "rejected" || input.leadStatus.toLowerCase().includes("rejected")) {
    return block("LEAD_REJECTED", "This lead has been rejected.");
  }
  if (input.gmailMessageId) return block("DUPLICATE_SEND_PREVENTED", "A Gmail message already exists for this lead.");

  return { allowed: true, status: "audit_completed", code: null, reason: null };
}

export function verifiedFindingStatements(findings: AuditFinding[], limit = 3): string[] {
  return findings
    .filter((finding) => finding.evidence.trim().length > 0)
    .slice(0, limit)
    .map((finding) => `${finding.title}: ${finding.evidence}`);
}
