import type { AuditFinding, AuditScores } from "@/types";


function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ??
      character,
  );
}

function stripClosing(value: string): string {
  return value
    .trim()
    .replace(/\n+(?:best regards|kind regards|warm regards|regards|sincerely|best),?\s*(?:\n.*)?$/i, "")
    .trim();
}

export interface ProfessionalEmailInput {
  body: string;
  companyName: string;
  findings: AuditFinding[];
  scores?: AuditScores;
  reportFilename?: string | null;
  logoUrl?: string;
}

export function renderProfessionalEmail(input: ProfessionalEmailInput): { html: string; plainText: string } {
  const body = stripClosing(input.body);
  const optOut = 'If this is not relevant, reply "not interested" and we will not follow up.';
  const signature = "Best regards,\nCode Nativex\ncodenativex.com";
  const plainText = `${body}\n\n${signature}\n\n${optOut}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222">${escapeHtml(plainText).replace(/\n/g, "<br>")}</div>`;
  return { html, plainText };
}

export function buildEvidenceEmailPrompt(input: {
  companyName: string;
  contactFirstName: string | null;
  website: string;
  service: string;
  city?: string | null;
  industry?: string | null;
  findings: AuditFinding[];
}): string {
  const greeting = input.contactFirstName ? `Hi ${input.contactFirstName},` : `Hi ${input.companyName} team,`;
  return `Write a professional, approachable and concise first-touch email from Code Nativex, following the approved template below. Return strict JSON only.

APPROVED TEMPLATE
Subject: Quick note on ${input.companyName}'s website
${greeting}

I came across ${input.companyName} while looking at businesses${input.city ? ` in ${input.city}` : ""} and took a quick look at your website.

A couple of things stood out: [one or two verified findings]. [A careful sentence about the likely impact on visitors or enquiries.]

I can share a short PDF report with practical fixes, or record a 2-minute video walking you through them. Would either be useful? No cost or obligation.

ALLOWED EVIDENCE
${JSON.stringify(input.findings.map(({ code, title, evidence, impact }) => ({ code, title, evidence, impact })), null, 2)}

RULES
- Start exactly with: ${greeting}
- Write like a thoughtful business colleague. Avoid sales hype, technical jargon and pressure.
- Follow the template's friendly, plain-English tone and short paragraphs. Personalize naturally; do not write a report, scorecard or technical list.
- Mention 1 or 2 supplied findings and return their codes. Use one finding if only one is verified.
- Use the real company name. Mention industry/city only if provided: ${input.industry || "not provided"}, ${input.city || "not provided"}.
- Treat website data as background only: ${input.website}. Do not print URLs or domain names in the generated body.
- Offer a short PDF report OR a 2-minute video. Offer to record/send it; never claim a video already exists.
- Do not attach, link to, or claim to have attached a report. Do not include a booking link or ask for a call in this first email.
- End with one low-pressure permission question and no cost or obligation.
- Body: 60 to 120 words, before the signature. Subject: Quick note on ${input.companyName}'s website.
- Mention at most one service: ${input.service || "website improvements"}; keep the main focus on helping the prospect.
- Do not add any sign-off, signature, sender name or opt-out line; the system adds those once.
- No invented load times, lost enquiries, percentages, case studies, buying intent or guarantees. Describe impact as a possibility.
- Replace every template placeholder with verified information. No square-bracket placeholders in the result.

RETURN EXACTLY
{"subject":"","body":"","finding_codes":[""]}`;
}
