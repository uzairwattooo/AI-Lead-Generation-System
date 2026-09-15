import type { AuditFinding } from "@/types";
import { serverEnv } from "@/server/env";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

export interface ProfessionalEmailInput {
  body: string;
  companyName: string;
  findings: AuditFinding[];
}

export function renderProfessionalEmail(input: ProfessionalEmailInput): { html: string; plainText: string } {
  const findingRows = input.findings.slice(0, 3).map((finding) => `<tr><td style="padding:7px 0;border-bottom:1px solid #e2e8f0;color:#17233c;font-size:13px;line-height:1.45"><strong style="color:#2563eb">${escapeHtml(finding.title)}</strong><br><span style="color:#526582">${escapeHtml(finding.evidence)}</span></td></tr>`).join("");
  const paragraphs = input.body.trim().split(/\n{2,}/).map((paragraph) => `<p style="margin:0 0 14px;color:#17233c;font-size:14px;line-height:1.6">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
  const optOut = 'If this is not relevant, reply "not interested" and we will not follow up.';
  const plainText = `${input.body.trim()}\n\nBest,\nCodeNativeX Team\n${serverEnv.contactEmail}\nhttps://codenativex.com\n\n${optOut}`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">A concise, evidence-based review of ${escapeHtml(input.companyName)}'s public website.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff"><tr><td align="center" style="padding:20px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px"><tr><td style="padding:0 0 16px;border-bottom:1px solid #e2e8f0"><span style="display:inline-block;background:#2563eb;color:#fff;border-radius:7px;padding:8px 7px;font-weight:700;font-size:13px">CX</span><span style="margin-left:9px;color:#17233c;font-weight:700;font-size:16px">CodeNativeX</span></td></tr><tr><td style="padding:22px 0 4px">${paragraphs}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 20px"><tr><td style="padding:0 0 6px;color:#526582;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Verified audit highlights</td></tr>${findingRows}</table><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:6px;background:#2563eb"><a href="${escapeHtml(serverEnv.meetingBookingUrl)}" style="display:inline-block;padding:11px 17px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700">Book a 15-minute review</a></td></tr></table><p style="margin:22px 0 0;color:#17233c;font-size:13px;line-height:1.55">Best,<br><strong>CodeNativeX Team</strong><br><a href="mailto:${escapeHtml(serverEnv.contactEmail)}" style="color:#2563eb">${escapeHtml(serverEnv.contactEmail)}</a><br><a href="https://codenativex.com" style="color:#2563eb">codenativex.com</a></p><p style="margin:18px 0 0;color:#718096;font-size:11px;line-height:1.45">${escapeHtml(optOut)}</p></td></tr></table></td></tr></table></body></html>`;
  return { html, plainText };
}

export function buildEvidenceEmailPrompt(input: { companyName: string; contactFirstName: string | null; website: string; service: string; findings: AuditFinding[] }): string {
  const greeting = input.contactFirstName ? input.contactFirstName : `${input.companyName} team`;
  return `Write the first professional audit outreach email from CodeNativeX. Return strict JSON only.\n\nALLOWED EVIDENCE\n${JSON.stringify(input.findings.map(({ code, title, evidence, impact }) => ({ code, title, evidence, impact })), null, 2)}\n\nRULES\n- Address ${greeting}.\n- Say CodeNativeX reviewed the company's public website: ${input.website}.\n- Mention exactly 2 or 3 findings from ALLOWED EVIDENCE and return their codes.\n- Explain impact carefully; never state uncertainty as fact.\n- Mention the attached audit report.\n- Offer one service only: ${input.service || "website performance and conversion engineering"}.\n- End with one question asking whether they are open to a 15-minute call.\n- Body must be 80 to 140 words and contain no signature or opt-out; the system adds both.\n- No hype, fake urgency, emojis, guarantees, pricing, invented facts, or claim that the company is looking for a redesign.\n- Subject must be 3 to 8 words and specific to the evidence.\n\nRETURN EXACTLY\n{"subject":"","body":"","finding_codes":[""]}`;
}
