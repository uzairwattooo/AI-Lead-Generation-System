import type { AuditFinding } from "@/types";

export interface DraftValidationInput {
  subject: string;
  body: string;
  findingCodes: string[];
  verifiedFindings: AuditFinding[];
}

const CLAIM_RULES: Array<[RegExp, string[]]> = [
  [/\b(slow|load(?:ing)? speed|core web vitals|performance score)\b/i, ["LOW_MOBILE_PERFORMANCE", "LOW_DESKTOP_PERFORMANCE"]],
  [/\b(title tag|page title)\b/i, ["MISSING_TITLE"]],
  [/\bmeta description\b/i, ["MISSING_META_DESCRIPTION"]],
  [/\b(h1|primary heading)\b/i, ["MISSING_H1", "MULTIPLE_H1"]],
  [/\bviewport\b/i, ["MISSING_VIEWPORT"]],
  [/\b(canonical)\b/i, ["MISSING_CANONICAL"]],
  [/\b(contact|booking) cta\b/i, ["NO_CONTACT_CTA"]],
  [/\bcontact form\b/i, ["NO_CONTACT_FORM"]],
  [/\bbroken (?:link|resource)/i, ["BROKEN_RESOURCES"]],
  [/\baccessibility\b/i, ["LOW_ACCESSIBILITY_SCORE"]],
  [/\btechnical seo|seo score\b/i, ["LOW_SEO_SCORE"]],
];

export function validateEvidenceDraft(input: DraftValidationInput): string[] {
  const errors: string[] = [];
  const subjectWords = input.subject.trim().split(/\s+/).filter(Boolean).length;
  const bodyWords = input.body.trim().split(/\s+/).filter(Boolean).length;
  const allowed = new Set(input.verifiedFindings.map((finding) => finding.code));
  const used = new Set(input.findingCodes);
  if (subjectWords < 3 || subjectWords > 12) errors.push("Subject must contain 3 to 12 words.");
  if (bodyWords < 45 || bodyWords > 140) errors.push("Body must contain 45 to 140 words before the signature.");
  if (used.size < 1 || used.size > 2) errors.push("Draft must reference 1 or 2 verified findings.");
  if ([...used].some((code) => !allowed.has(code))) errors.push("Draft references a finding that was not verified.");
  if (/looking (?:for|to)|seeking (?:a )?(?:redesign|website)/i.test(input.body)) errors.push("Draft claims unverified buying intent.");
  if (/best regards|kind regards|warm regards|\nregards,?|\nbest,?|sincerely|code\s*nativex team/i.test(input.body)) {
    errors.push("Draft must not include a signature or duplicate closing.");
  }
  if (/attach(?:ed|ment)|https?:\/\/|calendly|book a|\d+[- ]minute call|\bvideo\b/i.test(input.body)) errors.push("First-touch emails must offer the breakdown without attachments, booking links or video promises.");
  if (/\[[^\]]+\]|\{\{/.test(input.body + input.subject)) errors.push("Draft contains unresolved placeholders.");
  if (/\d+(?:\.\d+)?\s*%|guarantee|we recently worked|our client/i.test(input.body)) errors.push("Draft contains unapproved results or proof.");
  const evidenceText = input.verifiedFindings.filter((finding) => used.has(finding.code)).map((finding) => finding.evidence).join(" ").toLowerCase();
  for (const metric of input.body.match(/\b\d+(?:\.\d+)?\s*(?:seconds?|ms|percent|%)/gi) ?? []) {
    if (!evidenceText.includes(metric.toLowerCase())) errors.push("Draft contains a measurement absent from the selected evidence.");
  }
  for (const [pattern, requiredCodes] of CLAIM_RULES) {
    if (pattern.test(`${input.subject} ${input.body}`) && !requiredCodes.some((code) => used.has(code))) {
      errors.push(`Draft contains an unsupported claim matching ${pattern.source}.`);
    }
  }
  return errors;
}
