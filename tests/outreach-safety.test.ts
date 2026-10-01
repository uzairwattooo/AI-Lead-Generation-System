import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { validateEvidenceDraft } from "../src/server/outreach/draft-safety";
import { buildEvidenceEmailPrompt, renderProfessionalEmail } from "../src/server/outreach/email-template";

const findings = [
  { code: "MISSING_TITLE", title: "Homepage title is missing", priority: "high" as const, evidence: "Empty title.", impact: "Weaker snippet.", recommendation: "Add title." },
  { code: "NO_CONTACT_CTA", title: "No clear CTA", priority: "high" as const, evidence: "No contact CTA detected.", impact: "More enquiry friction.", recommendation: "Add CTA." },
];

test("draft validator accepts only referenced verified findings", () => {
  const body = "Hello Example team, CodeNativeX reviewed your public website and found that the page title is empty and no contact CTA was detected on the homepage. These issues may weaken the search-result headline and make it harder for visitors to start an enquiry. We have attached a short audit showing the evidence and practical fixes. Our website performance and conversion engineering team can help implement the highest-impact improvements without disrupting the existing customer journey. Would you be open to a focused 15-minute call to review the findings and decide whether any of the recommendations are worth prioritizing?";
  assert.deepEqual(validateEvidenceDraft({ subject: "Example website audit findings", body, findingCodes: ["MISSING_TITLE", "NO_CONTACT_CTA"], verifiedFindings: findings }), []);
});

test("draft validator blocks invented slow-site claims", () => {
  const errors = validateEvidenceDraft({ subject: "Example slow website review", body: "Your website is slow. ".repeat(50), findingCodes: ["MISSING_TITLE", "NO_CONTACT_CTA"], verifiedFindings: findings });
  assert.ok(errors.some((error) => error.includes("unsupported claim")));
});

test("professional email uses the approved dark brand template without duplicate closing", () => {
  const rendered = renderProfessionalEmail({
    companyName: "Example Dental",
    body: "Hello Example Dental team,\n\nCodeNativeX reviewed your public website and found that the homepage title is empty and no contact CTA was detected. These points may weaken the search-result headline and make it harder for visitors to start an enquiry. We attached a short audit with the evidence and practical priorities. Our website performance and conversion engineering team can help implement the most useful improvements without disrupting the existing customer journey. Would you be open to a focused 15-minute call to review the findings?\n\nBest regards,",
    findings,
    scores: { performanceMobile: 48, performanceDesktop: 76, seo: 74, accessibility: 89, bestPractices: 92 },
    reportFilename: "CodeNativeX-Website-Audit-Example-Dental.pdf",
  });
  assert.match(rendered.html, /background:#070a11/);
  assert.match(rendered.html, /codenativex-logo-transparent\.png/);
  assert.match(rendered.html, /CodeNativeX-Website-Audit-Example-Dental\.pdf/);
  assert.doesNotMatch(rendered.html, /Best regards|>Best,/i);
  assert.doesNotMatch(rendered.plainText, /Best regards|\nBest,/i);
});

test("email prompt requires friendly evidence-only copy and forbids sign-offs", () => {
  const prompt = buildEvidenceEmailPrompt({
    companyName: "Example Dental",
    contactFirstName: null,
    website: "https://example.test",
    service: "Website Performance",
    findings,
  });
  assert.match(prompt, /Hello Example Dental team,/);
  assert.match(prompt, /friendly and highly professional/i);
  assert.match(prompt, /Never write Best, Best regards/);
});

test("n8n send workflow attaches PDF binary and preserves explicit approval/idempotency gates", () => {
  const auditWorkflow = JSON.parse(readFileSync("n8n/02A-Website-Audit-Branded-Report-Generator.json", "utf8"));
  const workflow = JSON.parse(readFileSync("n8n/03-Personalized-Evidence-Based-Email-Outreach.json", "utf8"));
  const gmail = workflow.nodes.find((node: { name: string }) => node.name === "Gmail Send With Audit PDF");
  const adminGmail = workflow.nodes.find((node: { name: string }) => node.name === "Send Admin Outreach Notification");
  const openAi = workflow.nodes.find((node: { name: string }) => node.name === "Write Evidence-Based Draft");
  assert.equal(gmail.parameters.options.attachmentsUi.attachmentsBinary[0].property, "data");
  assert.equal(gmail.parameters.options.appendAttribution, false);
  assert.equal(openAi.typeVersion, 2.3);
  assert.equal(openAi.parameters.resource, "text");
  assert.equal(openAi.parameters.operation, "response");
  assert.equal(openAi.parameters.options.textFormat.textOptions.type, "json_schema");
  assert.equal(openAi.parameters.options.textFormat.textOptions.verbosity, "medium");
  assert.equal(adminGmail.parameters.sendTo, "={{ $json.adminEmail }}");
  assert.equal(adminGmail.parameters.options.appendAttribution, false);
  assert.equal(adminGmail.onError, "continueRegularOutput");
  assert.ok(workflow.nodes.some((node: { name: string }) => node.name === "Notify Admin?"));
  assert.ok(workflow.nodes.some((node: { name: string }) => node.name === "Return Outreach Completion"));
  assert.ok(auditWorkflow.nodes.some((node: { name: string }) => node.name === "Validate Shared Secret"));
  assert.ok(workflow.nodes.some((node: { name: string }) => node.name === "Queue Missing Audit"));
  const contextSource = readFileSync("src/app/api/internal/outreach/context/route.ts", "utf8");
  assert.match(contextSource, /email_preview_status !== "approved"/);
  assert.match(contextSource, /outreach_send_key/);
  assert.match(contextSource, /Duplicate send prevented/);
  assert.match(contextSource, /companyName: lead\.company_name/);
});

test("dashboard renders real API errors instead of a false empty state", () => {
  const source = readFileSync("src/components/leads/leads-workspace.tsx", "utf8");
  assert.match(source, /isError/);
  assert.match(source, /error instanceof Error \? error\.message/);
});
