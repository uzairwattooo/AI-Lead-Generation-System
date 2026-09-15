import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AuditFinding, WebsiteAudit } from "../../types/index";

const CONTACT_EMAIL = process.env.CODENATIVEX_CONTACT_EMAIL ?? "contact@codenativex.com";
const MEETING_URL = process.env.CODENATIVEX_MEETING_URL ?? "https://calendly.com/rajaziafat3258/30min";

const COLORS = {
  navy: rgb(23 / 255, 35 / 255, 60 / 255),
  blue: rgb(37 / 255, 99 / 255, 235 / 255),
  teal: rgb(13 / 255, 148 / 255, 136 / 255),
  muted: rgb(82 / 255, 101 / 255, 130 / 255),
  line: rgb(226 / 255, 232 / 255, 240 / 255),
  panel: rgb(248 / 255, 250 / 255, 252 / 255),
  white: rgb(1, 1, 1),
  danger: rgb(190 / 255, 24 / 255, 93 / 255),
  warning: rgb(180 / 255, 83 / 255, 9 / 255),
};

export interface AuditReportInput {
  companyName: string;
  audit: WebsiteAudit;
}

function safeFilenamePart(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "Company";
}

export function auditReportFilename(companyName: string): string {
  return `CodeNativeX-Website-Audit-${safeFilenamePart(companyName)}.pdf`;
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawTextBlock(
  page: PDFPage,
  font: PDFFont,
  text: string,
  options: { x: number; y: number; size: number; width: number; color?: ReturnType<typeof rgb>; lineHeight?: number },
): number {
  const lineHeight = options.lineHeight ?? options.size * 1.35;
  const lines = wrap(font, text, options.size, options.width);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * lineHeight,
      size: options.size,
      font,
      color: options.color ?? COLORS.navy,
    });
  });
  return options.y - lines.length * lineHeight;
}

function priorityColor(priority: AuditFinding["priority"]) {
  if (priority === "critical") return COLORS.danger;
  if (priority === "high") return COLORS.warning;
  if (priority === "medium") return COLORS.blue;
  return COLORS.teal;
}

export async function createAuditReportPdf(input: AuditReportInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdf.addPage(pageSize);
  const margin = 42;
  const contentWidth = pageSize[0] - margin * 2;
  let y = pageSize[1] - 46;

  const addHeader = () => {
    page.drawRectangle({ x: margin, y: y - 25, width: 34, height: 34, color: COLORS.blue });
    page.drawText("CX", { x: margin + 7.5, y: y - 13, font: bold, size: 13, color: COLORS.white });
    page.drawText("CodeNativeX", { x: margin + 44, y: y - 4, font: bold, size: 16, color: COLORS.navy });
    page.drawText("Production-grade web and AI engineering", {
      x: margin + 44,
      y: y - 19,
      font: regular,
      size: 8.5,
      color: COLORS.muted,
    });
    page.drawLine({ start: { x: margin, y: y - 37 }, end: { x: pageSize[0] - margin, y: y - 37 }, thickness: 1, color: COLORS.line });
    y -= 66;
  };

  const addFooter = (pageNumber: number) => {
    page.drawLine({ start: { x: margin, y: 34 }, end: { x: pageSize[0] - margin, y: 34 }, thickness: 1, color: COLORS.line });
    page.drawText(`${CONTACT_EMAIL}  |  codenativex.com`, { x: margin, y: 20, font: regular, size: 8, color: COLORS.muted });
    page.drawText(`Page ${pageNumber}`, { x: pageSize[0] - margin - 35, y: 20, font: regular, size: 8, color: COLORS.muted });
  };

  const ensureSpace = (needed: number) => {
    if (y - needed > 54) return;
    addFooter(pdf.getPageCount());
    page = pdf.addPage(pageSize);
    y = pageSize[1] - 46;
    addHeader();
  };

  addHeader();
  page.drawText("Website Audit Summary", { x: margin, y, font: bold, size: 24, color: COLORS.navy });
  y -= 25;
  y = drawTextBlock(page, regular, input.companyName, { x: margin, y, size: 12, width: contentWidth, color: COLORS.blue });
  y -= 5;
  y = drawTextBlock(page, regular, input.audit.finalUrl ?? input.audit.auditedUrl ?? "Website unavailable", {
    x: margin,
    y,
    size: 9,
    width: contentWidth,
    color: COLORS.muted,
  });
  y -= 18;

  const scoreItems = [
    ["Mobile", input.audit.scores.performanceMobile],
    ["Desktop", input.audit.scores.performanceDesktop],
    ["SEO", input.audit.scores.seo],
    ["Accessibility", input.audit.scores.accessibility],
    ["Best practices", input.audit.scores.bestPractices],
  ] as const;
  const cardGap = 7;
  const cardWidth = (contentWidth - cardGap * 4) / 5;
  scoreItems.forEach(([label, score], index) => {
    const x = margin + index * (cardWidth + cardGap);
    page.drawRectangle({ x, y: y - 54, width: cardWidth, height: 54, color: COLORS.panel, borderColor: COLORS.line, borderWidth: 0.7 });
    page.drawText(score === null ? "-" : String(score), { x: x + 9, y: y - 25, font: bold, size: 18, color: score !== null && score < 60 ? COLORS.warning : COLORS.blue });
    page.drawText(label, { x: x + 9, y: y - 42, font: regular, size: 7.3, color: COLORS.muted });
  });
  y -= 76;

  page.drawText("Assessment overview", { x: margin, y, font: bold, size: 12, color: COLORS.navy });
  y -= 17;
  const summary = input.audit.findings.length
    ? `This point-in-time audit identified ${input.audit.findings.length} verified improvement ${input.audit.findings.length === 1 ? "area" : "areas"}. The priorities below are based only on checks that returned usable evidence.`
    : "The automated checks did not return enough verified evidence to recommend outreach. Manual review is required.";
  y = drawTextBlock(page, regular, summary, { x: margin, y, size: 9.5, width: contentWidth, color: COLORS.muted, lineHeight: 13.5 });
  y -= 16;

  page.drawText("Priority findings", { x: margin, y, font: bold, size: 12, color: COLORS.navy });
  y -= 18;

  for (const finding of input.audit.findings.slice(0, 5)) {
    const estimated = 78 + wrap(regular, finding.evidence, 8.5, contentWidth - 30).length * 11;
    ensureSpace(estimated);
    page.drawRectangle({ x: margin, y: y - 12, width: 5, height: 12, color: priorityColor(finding.priority) });
    page.drawText(finding.priority.toUpperCase(), { x: margin + 13, y: y - 9, font: bold, size: 7.5, color: priorityColor(finding.priority) });
    page.drawText(finding.title, { x: margin + 72, y: y - 9, font: bold, size: 10, color: COLORS.navy });
    y -= 25;
    y = drawTextBlock(page, regular, `Evidence: ${finding.evidence}`, { x: margin + 13, y, size: 8.5, width: contentWidth - 13, color: COLORS.muted, lineHeight: 11.5 });
    y -= 5;
    y = drawTextBlock(page, regular, `Impact: ${finding.impact}`, { x: margin + 13, y, size: 8.5, width: contentWidth - 13, color: COLORS.muted, lineHeight: 11.5 });
    y -= 5;
    y = drawTextBlock(page, regular, `Recommended: ${finding.recommendation}`, { x: margin + 13, y, size: 8.5, width: contentWidth - 13, color: COLORS.navy, lineHeight: 11.5 });
    y -= 14;
    page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.6, color: COLORS.line });
    y -= 14;
  }

  ensureSpace(100);
  page.drawRectangle({ x: margin, y: y - 70, width: contentWidth, height: 70, color: rgb(239 / 255, 246 / 255, 1) });
  page.drawText("Review the findings with an engineer", { x: margin + 16, y: y - 24, font: bold, size: 12, color: COLORS.navy });
  page.drawText("Book a focused 15-minute call to discuss the highest-impact fixes.", { x: margin + 16, y: y - 42, font: regular, size: 9, color: COLORS.muted });
  page.drawText(MEETING_URL, { x: margin + 16, y: y - 57, font: bold, size: 8.5, color: COLORS.blue });
  y -= 86;
  y = drawTextBlock(page, regular, "Disclaimer: This report is a point-in-time automated assessment of publicly accessible pages. Scores and availability can change, and findings should be confirmed before implementation.", { x: margin, y, size: 7.5, width: contentWidth, color: COLORS.muted, lineHeight: 10 });

  addFooter(pdf.getPageCount());
  pdf.setTitle(`Website Audit Summary - ${input.companyName}`);
  pdf.setAuthor("CodeNativeX");
  pdf.setSubject("Evidence-based website audit");
  pdf.setCreator("CodeNativeX AI Lead Generation System");
  return pdf.save({ useObjectStreams: true });
}
