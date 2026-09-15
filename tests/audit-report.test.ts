import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";

import { auditReportFilename, createAuditReportPdf } from "../src/server/audits/report-pdf";
import type { WebsiteAudit } from "../src/types/index";

test("branded audit PDF is generated as a compact one-or-two-page attachment", async () => {
  const audit: WebsiteAudit = {
    id: "audit-1",
    leadId: "lead-1",
    status: "audit_completed",
    auditedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    httpStatus: 200,
    hasHttps: true,
    score: 72,
    confidence: 95,
    scores: { performanceMobile: 48, performanceDesktop: 76, seo: 74, accessibility: 89, bestPractices: 92 },
    findings: [
      { code: "LOW_MOBILE_PERFORMANCE", title: "Mobile performance needs attention", priority: "high", evidence: "Google PageSpeed mobile performance score was 48/100.", impact: "Slow mobile experiences can increase abandonment.", recommendation: "Optimize images, scripts, caching and Core Web Vitals." },
      { code: "MISSING_META_DESCRIPTION", title: "Meta description is missing", priority: "medium", evidence: "No non-empty meta description was found.", impact: "Search snippets may be unpredictable.", recommendation: "Add a concise service-focused description." },
    ],
    evidence: {},
    screenshotUrl: null,
    reportFilename: null,
    reportAvailable: false,
    generatedAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  };
  const bytes = await createAuditReportPdf({ companyName: "Example Dental & Co.", audit });
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "%PDF");
  assert.ok(bytes.byteLength < 5_000_000);
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() >= 1 && document.getPageCount() <= 2);
  assert.equal(auditReportFilename("Example Dental & Co."), "CodeNativeX-Website-Audit-Example-Dental-Co.pdf");
});
