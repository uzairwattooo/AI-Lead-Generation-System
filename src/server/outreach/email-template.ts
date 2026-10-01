import type { AuditFinding, AuditScores } from "@/types";
import { serverEnv } from "@/server/env";

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

function scoreColor(score: number): string {
  if (score < 50) return "#ec7d73";
  if (score < 75) return "#f2bd64";
  if (score < 90) return "#b17ee0";
  return "#54d8bd";
}

function renderScore(label: string, score: number | null): string {
  if (score === null) return "";
  const color = scoreColor(score);
  return `<td align="center" valign="top" width="33.33%" style="padding:2px 8px 17px">
    <table role="presentation" cellspacing="0" cellpadding="0"><tr><td width="62" height="62" align="center" valign="middle" style="width:62px;height:62px;border:6px solid ${color};border-radius:50%;font-size:18px;font-weight:700;color:#ffffff">${score}</td></tr></table>
    <p style="margin:8px 0 0;font-size:10px;color:#b4bdcc">${escapeHtml(label)}</p>
  </td>`;
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
  const findingRows = input.findings
    .slice(0, 3)
    .map(
      (finding, index) => `<tr>
        <td width="8" style="background:${["#e77b72", "#f5bb61", "#ad7ce0"][index]};border-radius:5px 0 0 5px"></td>
        <td style="padding:12px 14px;background:#111925;border:1px solid #293548;border-left:0;border-radius:0 8px 8px 0">
          <strong style="display:block;margin-bottom:4px;font-size:13px;color:#eef1f6">${escapeHtml(finding.title)}</strong>
          <span style="font-size:12px;line-height:1.55;color:#aeb7c7">${escapeHtml(finding.evidence)}</span>
        </td>
      </tr>${index < Math.min(input.findings.length, 3) - 1 ? '<tr><td height="8" colspan="2"></td></tr>' : ""}`,
    )
    .join("");
  const paragraphs = body
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 15px;color:#dfe3ea;font-size:15px;line-height:1.7">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  const scores = input.scores
    ? [
        renderScore("Mobile performance", input.scores.performanceMobile),
        renderScore("SEO", input.scores.seo),
        renderScore("Accessibility", input.scores.accessibility),
      ].filter(Boolean)
    : [];
  const scoreSection = scores.length
    ? `<tr><td style="padding:0 26px 8px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111925;border:1px solid #293548;border-radius:13px">
          <tr><td colspan="3" style="padding:15px 16px 12px;font-size:10px;font-weight:700;letter-spacing:1.3px;color:#8f99aa;text-transform:uppercase">Verified audit snapshot</td></tr>
          <tr>${scores.join("")}</tr>
        </table>
      </td></tr>`
    : "";
  const optOut = 'If this is not relevant, reply "not interested" and we will not follow up.';
  const reportFilename = input.reportFilename ?? `CodeNativeX-Website-Audit-${input.companyName}.pdf`;
  const logoUrl = input.logoUrl ?? serverEnv.logoUrl;
  const plainText = `${body}\n\nAudit report attached: ${reportFilename}\n\nCodeNativeX Team\n${serverEnv.contactEmail}\nhttps://codenativex.com\n\n${optOut}`;
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070a11;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">A concise, evidence-based review of ${escapeHtml(input.companyName)}'s public website.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#070a11">
    <tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:#0c111b;border:1px solid #253043;border-radius:16px;overflow:hidden">
        <tr><td style="height:4px;padding:0;background:#54d8bd;font-size:0;line-height:0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="25%" height="4" style="background:#54d8bd"></td><td width="25%" style="background:#f2bd64"></td><td width="25%" style="background:#ec7d73"></td><td width="25%" style="background:#b17ee0"></td></tr></table></td></tr>
        <tr><td style="padding:22px 26px 18px;border-bottom:1px solid #253043">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
            <td><img src="${escapeHtml(logoUrl)}" width="190" alt="CodeNativeX" style="display:block;width:190px;max-width:76%;height:auto;border:0;outline:none;background:transparent"></td>
            <td align="right" style="font-size:10px;font-weight:700;letter-spacing:1.3px;color:#54d8bd;text-transform:uppercase">Website audit prepared</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 26px 10px">${paragraphs}</td></tr>
        ${scoreSection}
        <tr><td style="padding:14px 26px 0">
          <div style="margin:0 0 9px;color:#8f99aa;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Priority findings</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${findingRows}</table>
        </td></tr>
        <tr><td style="padding:24px 26px 6px">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border:1px solid #54d8bd;border-radius:8px;background:#101824">
            <a href="${escapeHtml(serverEnv.meetingBookingUrl)}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.3px">Book a 15-minute review</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:14px 26px 22px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0f18;border:1px solid #202b3d;border-radius:10px"><tr>
            <td style="padding:12px 14px;font-size:11px;line-height:1.5;color:#8f99aa"><strong style="color:#dce1ea">PDF attached:</strong> ${escapeHtml(reportFilename)}</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:20px 26px;border-top:1px solid #253043;background:#090e17">
          <p style="margin:0;color:#ffffff;font-size:12px;font-weight:700;line-height:1.6">CodeNativeX Team</p>
          <p style="margin:3px 0 0;color:#c6cdda;font-size:11px;line-height:1.6"><a href="mailto:${escapeHtml(serverEnv.contactEmail)}" style="color:#54d8bd;text-decoration:none">${escapeHtml(serverEnv.contactEmail)}</a> &nbsp;|&nbsp; <a href="https://codenativex.com" style="color:#54d8bd;text-decoration:none">codenativex.com</a></p>
          <p style="margin:12px 0 0;color:#687489;font-size:10px;line-height:1.5">${escapeHtml(optOut)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
  return `Write a concise, friendly and highly professional first website-audit email from CodeNativeX. Return strict JSON only.\n\nALLOWED EVIDENCE\n${JSON.stringify(input.findings.map(({ code, title, evidence, impact }) => ({ code, title, evidence, impact })), null, 2)}\n\nRULES\n- Start exactly with: ${greeting}\n- Say CodeNativeX reviewed the company's public website: ${input.website}.\n- Mention exactly 2 or 3 findings from ALLOWED EVIDENCE and return their codes.\n- Explain the likely business impact carefully and naturally; never present uncertainty as fact.\n- Mention the attached short audit report.\n- Offer one service only: ${input.service || "website performance and conversion engineering"}.\n- End with one friendly question asking whether they are open to a focused 15-minute call.\n- Body must be 80 to 140 words.\n- Do not add any sign-off, signature, sender name, website URL or opt-out line; the system adds those.\n- Never write Best, Best regards, Regards, Kind regards, Warm regards or Sincerely.\n- No hype, fake urgency, emojis, guarantees, pricing, jargon, invented facts, or claim that the company is looking for a redesign.\n- Subject must be 3 to 8 words and specific to this company's verified evidence; do not reuse a generic subject.\n\nRETURN EXACTLY\n{"subject":"","body":"","finding_codes":[""]}`;
}
