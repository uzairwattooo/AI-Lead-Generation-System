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
  if (subjectWords < 3 || subjectWords > 8) errors.push("Subject must contain 3 to 8 words.");
  if (bodyWords < 80 || bodyWords > 140) errors.push("Body must contain 80 to 140 words before the signature.");
  if (used.size < 2 || used.size > 3) errors.push("Draft must reference exactly 2 or 3 verified findings.");
  if ([...used].some((code) => !allowed.has(code))) errors.push("Draft references a finding that was not verified.");
  if (/looking (?:for|to)|seeking (?:a )?(?:redesign|website)/i.test(input.body)) errors.push("Draft claims unverified buying intent.");
  if (/best regards|\nbest,|code\s*nativex team/i.test(input.body)) errors.push("Draft must not include a signature or duplicate closing.");
  for (const [pattern, requiredCodes] of CLAIM_RULES) {
    if (pattern.test(`${input.subject} ${input.body}`) && !requiredCodes.some((code) => used.has(code))) {
      errors.push(`Draft contains an unsupported claim matching ${pattern.source}.`);
    }
  }
  return errors;
}
