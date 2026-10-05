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
  findings: AuditFinding[];
}): string {
  const greeting = input.contactFirstName ? `Hello ${input.contactFirstName},` : `Hello ${input.companyName} team,`;
  return `Write a concise, friendly and highly professional first website-audit email from CodeNativeX. Return strict JSON only.\n\nALLOWED EVIDENCE\n${JSON.stringify(input.findings.map(({ code, title, evidence, impact }) => ({ code, title, evidence, impact })), null, 2)}\n\nRULES\n- Start exactly with: ${greeting}\n- Say CodeNativeX reviewed the company's public website: ${input.website}.\n- Mention 1 or 2 findings from ALLOWED EVIDENCE and return their codes.\n- Explain the likely business impact carefully and naturally; never present uncertainty as fact.\n- Do not attach, link to, or claim to have attached a report. Do not include a booking link.
- Offer a free short breakdown with practical fixes and ask: Would you like me to send it over?
- Do not promise a video; videos are handled through a 30-minute Google Meet call after a reply.\n- Offer one service only: ${input.service || "website performance and conversion engineering"}.\n- End with one low-pressure question asking permission to send the breakdown, with no cost or obligation.\n- Body must be 60 to 120 words.\n- Do not add any sign-off, signature, sender name, website URL or opt-out line; the system adds those.\n- Never write Best, Best regards, Regards, Kind regards, Warm regards or Sincerely.\n- No hype, fake urgency, emojis, guarantees, pricing, jargon, invented facts, or claim that the company is looking for a redesign.\n- Subject: Quick note on the company website, including the actual business name.
- Never claim a measured load time, enquiry loss, percentage improvement or case study unless explicitly established by the supplied evidence.\n\nRETURN EXACTLY\n{"subject":"","body":"","finding_codes":[""]}`;
}
