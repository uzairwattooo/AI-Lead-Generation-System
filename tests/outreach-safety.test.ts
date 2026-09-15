import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { validateEvidenceDraft } from "../src/server/outreach/draft-safety";

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

test("n8n send workflow attaches PDF binary and preserves explicit approval/idempotency gates", () => {
  const auditWorkflow = JSON.parse(readFileSync("n8n/02A-Website-Audit-Branded-Report-Generator.json", "utf8"));
  const workflow = JSON.parse(readFileSync("n8n/03-Personalized-Evidence-Based-Email-Outreach.json", "utf8"));
  const gmail = workflow.nodes.find((node: { name: string }) => node.name === "Gmail Send With Audit PDF");
  assert.equal(gmail.parameters.options.attachmentsUi.attachmentsBinary[0].property, "data");
  assert.equal(gmail.parameters.options.appendAttribution, false);
  assert.ok(auditWorkflow.nodes.some((node: { name: string }) => node.name === "Validate Shared Secret"));
  assert.ok(workflow.nodes.some((node: { name: string }) => node.name === "Queue Missing Audit"));
  const contextSource = readFileSync("src/app/api/internal/outreach/context/route.ts", "utf8");
  assert.match(contextSource, /email_preview_status !== "approved"/);
  assert.match(contextSource, /outreach_send_key/);
  assert.match(contextSource, /Duplicate send prevented/);
});

test("dashboard renders real API errors instead of a false empty state", () => {
  const source = readFileSync("src/components/leads/leads-workspace.tsx", "utf8");
  assert.match(source, /isError/);
  assert.match(source, /error instanceof Error \? error\.message/);
});
