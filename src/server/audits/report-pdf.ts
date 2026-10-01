import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

import type { AuditFinding, WebsiteAudit } from "../../types/index";

const CONTACT_EMAIL = process.env.CODENATIVEX_CONTACT_EMAIL ?? "contact@codenativex.com";
const MEETING_URL = process.env.CODENATIVEX_MEETING_URL ?? "https://calendly.com/rajaziafat3258/30min";
const WEBSITE_URL = "https://codenativex.com";
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  background: rgb(9 / 255, 13 / 255, 22 / 255),
  panel: rgb(16 / 255, 23 / 255, 35 / 255),
  panelDark: rgb(11 / 255, 17 / 255, 28 / 255),
  panelLight: rgb(19 / 255, 28 / 255, 42 / 255),
  line: rgb(38 / 255, 49 / 255, 67 / 255),
  text: rgb(242 / 255, 244 / 255, 248 / 255),
  muted: rgb(165 / 255, 173 / 255, 189 / 255),
  subtle: rgb(117 / 255, 128 / 255, 150 / 255),
  mint: rgb(84 / 255, 216 / 255, 189 / 255),
  amber: rgb(245 / 255, 187 / 255, 97 / 255),
  coral: rgb(231 / 255, 123 / 255, 114 / 255),
  pink: rgb(210 / 255, 116 / 255, 174 / 255),
  purple: rgb(173 / 255, 124 / 255, 224 / 255),
  cyan: rgb(74 / 255, 190 / 255, 214 / 255),
  track: rgb(39 / 255, 50 / 255, 67 / 255),
  black: rgb(7 / 255, 10 / 255, 17 / 255),
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

function pdfText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrap(font: PDFFont, value: string, size: number, width: number): string[] {
  const words = pdfText(value).split(" ").filter(Boolean);
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

function fitLines(font: PDFFont, value: string, size: number, width: number, limit: number): string[] {
  const lines = wrap(font, value, size, width);
  if (lines.length <= limit) return lines;
  const clipped = lines.slice(0, limit);
  let last = clipped[limit - 1] ?? "";
  while (last && font.widthOfTextAtSize(`${last}...`, size) > width) last = last.slice(0, -1).trimEnd();
  clipped[limit - 1] = `${last}...`;
  return clipped;
}

function drawLines(
  page: PDFPage,
  font: PDFFont,
  lines: string[],
  options: { x: number; y: number; size: number; color: RGB; lineHeight?: number },
): void {
  const lineHeight = options.lineHeight ?? options.size * 1.35;
  lines.forEach((line, index) => {
    page.drawText(line, { x: options.x, y: options.y - index * lineHeight, size: options.size, font, color: options.color });
  });
}

function drawCentered(page: PDFPage, font: PDFFont, value: string, x: number, y: number, width: number, size: number, color: RGB): void {
  const text = pdfText(value);
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: x + Math.max(0, (width - textWidth) / 2), y, size, font, color });
}

function drawPanel(page: PDFPage, x: number, y: number, width: number, height: number, color = COLORS.panel): void {
  page.drawRectangle({ x, y, width, height, color, borderColor: COLORS.line, borderWidth: 1 });
}

function drawBackground(page: PDFPage, pageNumber: number): void {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLORS.background });
  for (let x = 12; x < PAGE_WIDTH; x += 18) {
    for (let y = 12; y < PAGE_HEIGHT; y += 18) {
      page.drawCircle({ x, y, size: 0.65, color: COLORS.subtle, opacity: 0.18 });
    }
  }
  page.drawCircle({
    x: pageNumber === 1 ? PAGE_WIDTH + 5 : 5,
    y: pageNumber === 1 ? 650 : 590,
    size: 94,
    color: pageNumber === 1 ? COLORS.purple : COLORS.mint,
    opacity: 0.11,
  });
  page.drawCircle({
    x: pageNumber === 1 ? 5 : PAGE_WIDTH - 5,
    y: pageNumber === 1 ? 180 : 65,
    size: 90,
    color: pageNumber === 1 ? COLORS.mint : COLORS.purple,
    opacity: 0.09,
  });
}

function drawFooter(page: PDFPage, regular: PDFFont, pageNumber: number): void {
  const left = pageNumber === 1 ? "CodeNativeX | Website Engineering" : `${CONTACT_EMAIL} | codenativex.com`;
  page.drawText(pdfText(left), { x: MARGIN, y: 24, size: 6.7, font: regular, color: COLORS.subtle });
  page.drawLine({ start: { x: MARGIN + 145, y: 27 }, end: { x: PAGE_WIDTH - MARGIN - 25, y: 27 }, thickness: 0.7, color: COLORS.line });
  page.drawText(`0${pageNumber}`, { x: PAGE_WIDTH - MARGIN - 12, y: 24, size: 6.7, font: regular, color: COLORS.subtle });
}

function formatAuditDate(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

async function loadLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "brand", "codenativex-logo-transparent.png"));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

function drawHeader(page: PDFPage, logo: PDFImage | null, regular: PDFFont, bold: PDFFont, title: string, subtitle: string): void {
  if (logo) {
    const dimensions = logo.scaleToFit(165, 48);
    page.drawImage(logo, { x: MARGIN, y: PAGE_HEIGHT - 71, width: dimensions.width, height: dimensions.height });
  } else {
    page.drawText("CodeNativeX", { x: MARGIN, y: PAGE_HEIGHT - 54, size: 18, font: bold, color: COLORS.text });
  }
  const titleText = pdfText(title.toUpperCase());
  const subtitleText = pdfText(subtitle);
  page.drawText(titleText, {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(titleText, 9),
    y: PAGE_HEIGHT - 46,
    size: 9,
    font: bold,
    color: COLORS.text,
  });
  page.drawText(subtitleText, {
    x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(subtitleText, 7.2),
    y: PAGE_HEIGHT - 60,
    size: 7.2,
    font: regular,
    color: COLORS.muted,
  });
  page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 84 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 84 }, thickness: 0.8, color: COLORS.line });
}

function drawBadge(page: PDFPage, regular: PDFFont, bold: PDFFont, y: number, label: string): void {
  page.drawRectangle({ x: MARGIN, y, width: CONTENT_WIDTH, height: 24, color: COLORS.black, borderColor: COLORS.mint, borderWidth: 0.7 });
  page.drawLine({ start: { x: MARGIN + CONTENT_WIDTH * 0.25, y }, end: { x: MARGIN + CONTENT_WIDTH * 0.5, y }, thickness: 0.7, color: COLORS.amber });
  page.drawLine({ start: { x: MARGIN + CONTENT_WIDTH * 0.5, y }, end: { x: MARGIN + CONTENT_WIDTH * 0.75, y }, thickness: 0.7, color: COLORS.coral });
  page.drawLine({ start: { x: MARGIN + CONTENT_WIDTH * 0.75, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 0.7, color: COLORS.purple });
  page.drawCircle({ x: MARGIN + 11, y: y + 12, size: 3.3, color: COLORS.mint });
  page.drawText(pdfText(label.toUpperCase()), { x: MARGIN + 20, y: y + 8.5, size: 7.2, font: bold, color: COLORS.mint });
  page.drawText("CNX", { x: PAGE_WIDTH - MARGIN - 22, y: y + 8.5, size: 5.8, font: regular, color: COLORS.subtle });
}

function scoreColor(index: number): RGB {
  return [COLORS.coral, COLORS.amber, COLORS.mint, COLORS.purple, COLORS.cyan][index] ?? COLORS.mint;
}

function scoreSummary(score: number | null): string {
  if (score === null) return "Not available";
  if (score < 60) return "Needs focused improvement";
  if (score < 80) return "Room to improve";
  if (score < 90) return "Good foundation";
  return "Strong technical baseline";
}

function drawScoreRing(page: PDFPage, bold: PDFFont, centerX: number, centerY: number, score: number | null, color: RGB): void {
  const normalized = score === null ? 0 : Math.max(0, Math.min(100, score));
  const radius = 25;
  for (let index = 0; index < 50; index += 1) {
    const angle = (-90 + (index / 50) * 360) * (Math.PI / 180);
    page.drawCircle({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      size: 2.5,
      color: index * 2 < normalized ? color : COLORS.track,
    });
  }
  const value = score === null ? "-" : String(score);
  const width = bold.widthOfTextAtSize(value, 15.5);
  page.drawText(value, { x: centerX - width / 2, y: centerY - 5.5, size: 15.5, font: bold, color: COLORS.text });
}

function priorityColor(priority: AuditFinding["priority"], index: number): RGB {
  if (priority === "critical") return COLORS.coral;
  if (priority === "high") return index % 2 === 0 ? COLORS.coral : COLORS.amber;
  if (priority === "medium") return COLORS.purple;
  return COLORS.mint;
}

function hostname(value: string | null): string {
  if (!value) return "Website unavailable";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function executiveSummary(audit: WebsiteAudit): string {
  const statements: string[] = [];
  if (audit.hasHttps) statements.push("The public website is available over HTTPS");
  if (audit.httpStatus) statements.push(`the homepage returned HTTP ${audit.httpStatus}`);
  if (audit.findings.length) statements.push(`${audit.findings.length} evidence-backed improvement ${audit.findings.length === 1 ? "area was" : "areas were"} identified`);
  if (!statements.length) return "The automated review completed with limited verified evidence. Findings should be reviewed before any implementation decision.";
  return `${statements.join(", and ")}. The priorities in this report use only completed checks and are intended to guide practical improvements without treating unavailable data as a confirmed issue.`;
}

export async function createAuditReportPdf(input: AuditReportInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(pdf);
  const pageOne = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  drawBackground(pageOne, 1);
  drawHeader(pageOne, logo, regular, bold, "Website Audit Summary", `Prepared ${formatAuditDate(input.audit.generatedAt)}`);
  drawBadge(pageOne, regular, bold, 673, "Enterprise software engineering agency");

  pageOne.drawText("A clearer path to a", { x: MARGIN, y: 630, size: 27, font: bold, color: COLORS.text });
  pageOne.drawText("faster,", { x: MARGIN + 254, y: 630, size: 27, font: bold, color: COLORS.mint });
  pageOne.drawText("stronger website.", { x: MARGIN, y: 597, size: 27, font: bold, color: COLORS.coral });
  pageOne.drawLine({ start: { x: MARGIN + 112, y: 595 }, end: { x: MARGIN + 260, y: 595 }, thickness: 2.2, color: COLORS.pink });
  drawLines(pageOne, regular, fitLines(regular, "A concise, evidence-led review of the public website experience. Every finding below is tied to a completed automated check and is intended to help prioritize practical improvements.", 9.2, CONTENT_WIDTH, 3), { x: MARGIN, y: 568, size: 9.2, color: COLORS.muted, lineHeight: 14 });

  const identityY = 496;
  drawPanel(pageOne, MARGIN, identityY, CONTENT_WIDTH, 55);
  const identityColumns = [225, 150, CONTENT_WIDTH - 375];
  const identityData = [
    ["Company", input.companyName],
    ["Audited website", hostname(input.audit.finalUrl ?? input.audit.auditedUrl)],
    ["Audit status", input.audit.status === "audit_completed" ? "Verified | Live checks" : pdfText(input.audit.status.replaceAll("_", " "))],
  ];
  let identityX = MARGIN;
  identityData.forEach(([label, value], index) => {
    if (index > 0) pageOne.drawLine({ start: { x: identityX, y: identityY }, end: { x: identityX, y: identityY + 55 }, thickness: 0.8, color: COLORS.line });
    pageOne.drawText(label!.toUpperCase(), { x: identityX + 13, y: identityY + 36, size: 6.5, font: bold, color: COLORS.subtle });
    drawLines(pageOne, regular, fitLines(regular, value!, 9.3, identityColumns[index]! - 24, 2), { x: identityX + 13, y: identityY + 17, size: 9.3, color: index === 1 ? COLORS.mint : COLORS.text, lineHeight: 10 });
    identityX += identityColumns[index]!;
  });

  pageOne.drawText("Audit scorecard", { x: MARGIN, y: 464, size: 13, font: bold, color: COLORS.text });
  const scoreCaption = "Scores shown out of 100";
  pageOne.drawText(scoreCaption, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(scoreCaption, 7.2), y: 465, size: 7.2, font: regular, color: COLORS.muted });
  const scoreItems = [
    ["Mobile performance", input.audit.scores.performanceMobile],
    ["Desktop performance", input.audit.scores.performanceDesktop],
    ["SEO", input.audit.scores.seo],
    ["Accessibility", input.audit.scores.accessibility],
    ["Best practices", input.audit.scores.bestPractices],
  ] as const;
  const scoreGap = 7;
  const scoreWidth = (CONTENT_WIDTH - scoreGap * 4) / 5;
  scoreItems.forEach(([label, score], index) => {
    const x = MARGIN + index * (scoreWidth + scoreGap);
    drawPanel(pageOne, x, 333, scoreWidth, 115, COLORS.panelLight);
    drawScoreRing(pageOne, bold, x + scoreWidth / 2, 400, score, scoreColor(index));
    drawCentered(pageOne, bold, label, x + 4, 354, scoreWidth - 8, 7.2, COLORS.text);
    drawCentered(pageOne, regular, scoreSummary(score), x + 4, 340, scoreWidth - 8, 5.8, COLORS.muted);
  });

  const snapshotY = 130;
  const snapshotHeight = 180;
  const leftWidth = 300;
  drawPanel(pageOne, MARGIN, snapshotY, leftWidth, snapshotHeight);
  pageOne.drawText("Executive snapshot", { x: MARGIN + 14, y: snapshotY + snapshotHeight - 24, size: 11, font: bold, color: COLORS.text });
  drawLines(pageOne, regular, fitLines(regular, executiveSummary(input.audit), 8.1, leftWidth - 28, 8), { x: MARGIN + 14, y: snapshotY + snapshotHeight - 45, size: 8.1, color: COLORS.muted, lineHeight: 12 });

  const factsX = MARGIN + leftWidth + 9;
  const factsWidth = CONTENT_WIDTH - leftWidth - 9;
  drawPanel(pageOne, factsX, snapshotY, factsWidth, snapshotHeight);
  const facts = [
    [input.audit.httpStatus === null ? "-" : String(input.audit.httpStatus), "Homepage HTTP status"],
    [String(input.audit.findings.length), "Verified priority findings"],
    [input.audit.hasHttps === null ? "-" : input.audit.hasHttps ? "HTTPS" : "HTTP", "Secure connection"],
    [input.audit.confidence === null ? "-" : `${input.audit.confidence}%`, "Audit confidence"],
  ];
  facts.forEach(([value, label], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const boxWidth = (factsWidth - 30) / 2;
    const x = factsX + 10 + column * (boxWidth + 10);
    const y = snapshotY + snapshotHeight - 82 - row * 79;
    pageOne.drawRectangle({ x, y, width: boxWidth, height: 68, color: COLORS.panelDark, borderColor: COLORS.line, borderWidth: 0.8 });
    pageOne.drawText(value!, { x: x + 11, y: y + 39, size: 13.5, font: bold, color: COLORS.mint });
    drawLines(pageOne, regular, fitLines(regular, label!, 6.5, boxWidth - 22, 2), { x: x + 11, y: y + 20, size: 6.5, color: COLORS.muted, lineHeight: 9 });
  });
  drawFooter(pageOne, regular, 1);

  const pageTwo = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawBackground(pageTwo, 2);
  drawHeader(pageTwo, logo, regular, bold, "Priority Findings", "Evidence | impact | recommendation");
  drawBadge(pageTwo, regular, bold, 673, "Verified improvement opportunities");
  pageTwo.drawText("Focus first on the issues with the", { x: MARGIN, y: 630, size: 23, font: bold, color: COLORS.text });
  pageTwo.drawText("largest visitor impact.", { x: MARGIN, y: 598, size: 23, font: bold, color: COLORS.amber });
  pageTwo.drawLine({ start: { x: MARGIN + 86, y: 596 }, end: { x: MARGIN + 270, y: 596 }, thickness: 2.2, color: COLORS.coral });
  drawLines(pageTwo, regular, fitLines(regular, "The recommendations are prioritized for clarity. Unavailable audit data is never presented as a confirmed problem.", 8.8, CONTENT_WIDTH, 2), { x: MARGIN, y: 568, size: 8.8, color: COLORS.muted, lineHeight: 13 });

  const findings = input.audit.findings.slice(0, 4);
  const listTop = 526;
  const availableHeight = 372;
  const findingGap = 8;
  const findingHeight = findings.length ? Math.min(108, (availableHeight - findingGap * (findings.length - 1)) / findings.length) : 108;
  findings.forEach((finding, index) => {
    const y = listTop - findingHeight - index * (findingHeight + findingGap);
    const accent = priorityColor(finding.priority, index);
    drawPanel(pageTwo, MARGIN, y, CONTENT_WIDTH, findingHeight);
    pageTwo.drawRectangle({ x: MARGIN + 12, y: y + 12, width: 34, height: findingHeight - 24, color: accent });
    drawCentered(pageTwo, bold, String(index + 1).padStart(2, "0"), MARGIN + 12, y + findingHeight / 2 - 6, 34, 13.5, COLORS.black);
    const contentX = MARGIN + 58;
    pageTwo.drawText(pdfText(finding.title), { x: contentX, y: y + findingHeight - 23, size: 10.2, font: bold, color: COLORS.text });
    const severity = `${finding.priority.toUpperCase()} PRIORITY`;
    pageTwo.drawText(severity, { x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(severity, 6.2) - 12, y: y + findingHeight - 22, size: 6.2, font: bold, color: accent });
    const columnGap = 9;
    const columnWidth = (CONTENT_WIDTH - 58 - columnGap * 2 - 14) / 3;
    const columns = [
      ["Evidence", finding.evidence],
      ["Business impact", finding.impact],
      ["Recommended", finding.recommendation],
    ];
    columns.forEach(([label, value], columnIndex) => {
      const x = contentX + columnIndex * (columnWidth + columnGap);
      pageTwo.drawLine({ start: { x, y: y + findingHeight - 35 }, end: { x: x + columnWidth, y: y + findingHeight - 35 }, thickness: 0.7, color: COLORS.line });
      pageTwo.drawText(label!.toUpperCase(), { x, y: y + findingHeight - 48, size: 6.3, font: bold, color: COLORS.text });
      drawLines(pageTwo, regular, fitLines(regular, value!, 6.5, columnWidth, findingHeight < 95 ? 3 : 4), { x, y: y + findingHeight - 61, size: 6.5, color: COLORS.muted, lineHeight: 9 });
    });
  });

  if (!findings.length) {
    drawPanel(pageTwo, MARGIN, 375, CONTENT_WIDTH, 120);
    pageTwo.drawText("No verified findings available", { x: MARGIN + 18, y: 458, size: 15, font: bold, color: COLORS.text });
    drawLines(pageTwo, regular, fitLines(regular, "The audit did not return enough completed evidence to support automatic outreach. Manual review is required.", 9, CONTENT_WIDTH - 36, 3), { x: MARGIN + 18, y: 432, size: 9, color: COLORS.muted, lineHeight: 13 });
  }

  const ctaY = 79;
  pageTwo.drawRectangle({ x: MARGIN, y: ctaY, width: CONTENT_WIDTH, height: 62, color: COLORS.panel, borderColor: COLORS.mint, borderWidth: 0.8 });
  pageTwo.drawText("Review the findings with an engineer", { x: MARGIN + 15, y: ctaY + 38, size: 12.5, font: bold, color: COLORS.text });
  drawLines(pageTwo, regular, fitLines(regular, "CodeNativeX can walk through the highest-impact fixes and outline a practical implementation plan.", 7.3, 330, 2), { x: MARGIN + 15, y: ctaY + 20, size: 7.3, color: COLORS.muted, lineHeight: 9 });
  const ctaLabel = "BOOK A 15-MINUTE REVIEW";
  pageTwo.drawRectangle({ x: PAGE_WIDTH - MARGIN - 158, y: ctaY + 15, width: 144, height: 32, color: COLORS.panelDark, borderColor: COLORS.mint, borderWidth: 1 });
  drawCentered(pageTwo, bold, ctaLabel, PAGE_WIDTH - MARGIN - 158, ctaY + 26, 144, 7.3, COLORS.text);
  pageTwo.drawText(pdfText(MEETING_URL), { x: MARGIN, y: 56, size: 6.2, font: regular, color: COLORS.mint });
  drawLines(pageTwo, regular, fitLines(regular, "Point-in-time disclaimer: this automated assessment covers publicly accessible pages. Scores and availability may change, and findings should be confirmed before implementation.", 5.8, CONTENT_WIDTH, 2), { x: MARGIN, y: 45, size: 5.8, color: COLORS.subtle, lineHeight: 7 });
  drawFooter(pageTwo, regular, 2);

  pdf.setTitle(`Website Audit Summary - ${pdfText(input.companyName)}`);
  pdf.setAuthor("CodeNativeX");
  pdf.setSubject("Evidence-based website audit");
  pdf.setCreator("CodeNativeX AI Lead Generation System");
  pdf.setProducer("CodeNativeX");
  pdf.setKeywords(["website audit", "performance", "SEO", "accessibility", WEBSITE_URL]);
  return pdf.save({ useObjectStreams: true });
}
