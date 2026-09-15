import { mkdir, writeFile } from "node:fs/promises";
import { createAuditReportPdf } from "../src/server/audits/report-pdf";
import type { WebsiteAudit } from "../src/types/index";

const audit: WebsiteAudit = {
  id: "sample-audit",
  leadId: "sample-lead",
  status: "audit_completed",
  auditedUrl: "https://example-dental.com",
  finalUrl: "https://example-dental.com/",
  httpStatus: 200,
  hasHttps: true,
  score: 71,
  confidence: 94,
  scores: { performanceMobile: 48, performanceDesktop: 78, seo: 76, accessibility: 88, bestPractices: 91 },
  findings: [
    { code: "LOW_MOBILE_PERFORMANCE", title: "Mobile performance needs attention", priority: "high", evidence: "Google PageSpeed mobile performance score was 48/100.", impact: "Slow mobile experiences can increase abandonment and reduce enquiries.", recommendation: "Prioritize image optimization, script reduction, caching, and Core Web Vitals." },
    { code: "MISSING_META_DESCRIPTION", title: "Meta description is missing", priority: "medium", evidence: "No non-empty meta description was found in the fetched homepage HTML.", impact: "Search engines may choose an unpredictable snippet.", recommendation: "Write a concise, service-focused meta description." },
    { code: "NO_CONTACT_CTA", title: "No clear contact or booking CTA was detected", priority: "high", evidence: "No contact, booking, appointment, quote, consultation, or schedule link/button was detected on the fetched homepage.", impact: "Visitors may need extra effort to start an enquiry.", recommendation: "Add one prominent, specific contact or booking action." },
  ],
  evidence: {},
  screenshotUrl: null,
  reportFilename: "CodeNativeX-Website-Audit-Example-Dental.pdf",
  reportAvailable: true,
  generatedAt: new Date().toISOString(),
  errorCode: null,
  errorMessage: null,
};

async function main() {
  await mkdir("output/pdf", { recursive: true });
  const bytes = await createAuditReportPdf({ companyName: "Example Dental", audit });
  await writeFile("output/pdf/CodeNativeX-Website-Audit-Sample.pdf", bytes);
}

void main();
