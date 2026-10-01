import { mkdir, readFile, writeFile } from "node:fs/promises";

import { renderProfessionalEmail } from "../src/server/outreach/email-template";

const findings = [
  {
    code: "LOW_MOBILE_PERFORMANCE",
    title: "Mobile performance needs attention",
    priority: "high" as const,
    evidence: "Google PageSpeed mobile performance score was 48/100.",
    impact: "Slow mobile experiences can increase abandonment and reduce enquiries.",
    recommendation: "Prioritize image optimization, script reduction, caching, and Core Web Vitals.",
  },
  {
    code: "MISSING_META_DESCRIPTION",
    title: "Meta description is missing",
    priority: "medium" as const,
    evidence: "No non-empty meta description was found in the fetched homepage HTML.",
    impact: "Search engines may choose an unpredictable snippet.",
    recommendation: "Write a concise, service-focused meta description.",
  },
  {
    code: "NO_CONTACT_CTA",
    title: "No clear contact or booking CTA was detected",
    priority: "high" as const,
    evidence: "No contact, booking, appointment, quote, consultation, or schedule action was detected.",
    impact: "Visitors may need extra effort to start an enquiry.",
    recommendation: "Add one prominent, specific contact or booking action.",
  },
];

async function main() {
  const logo = await readFile("public/brand/codenativex-logo-transparent.png");
  const rendered = renderProfessionalEmail({
    companyName: "Example Dental",
    body: "Hello Example Dental team,\n\nCodeNativeX reviewed your public website and identified a few practical opportunities. Mobile performance measured 48/100, the homepage did not include a meta description, and we could not detect a clear contact or booking action. These items may create friction for visitors and make search snippets less predictable.\n\nWe attached a short audit with the supporting evidence and recommended priorities. Our website performance and conversion engineering team can help address the highest-impact improvements. Would you be open to a focused 15-minute call to review the findings?",
    findings,
    scores: {
      performanceMobile: 48,
      performanceDesktop: 78,
      seo: 76,
      accessibility: 88,
      bestPractices: 91,
    },
    reportFilename: "CodeNativeX-Website-Audit-Example-Dental.pdf",
    logoUrl: `data:image/png;base64,${logo.toString("base64")}`,
  });

  await mkdir("output/email", { recursive: true });
  await writeFile("output/email/CodeNativeX-Email-Template-Sample.html", rendered.html);
  await writeFile("output/email/CodeNativeX-Email-Template-Sample.txt", rendered.plainText);
}

void main();
