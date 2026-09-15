import test from "node:test";
import assert from "node:assert/strict";

import { evaluateAuditOutreachSafety } from "../src/server/audits/audit-safety";
import { deriveVerifiedFindings, type HomepageEvidence, type PageSpeedEvidence } from "../src/server/audits/audit-findings";

const verifiedFinding = {
  code: "MISSING_TITLE",
  title: "Homepage title is missing",
  priority: "high" as const,
  evidence: "The fetched homepage returned an empty title element.",
  impact: "Search result quality may be weaker.",
  recommendation: "Add a descriptive title.",
};

const safeInput = {
  websiteIdentityVerified: true,
  websiteIdentityConfidence: 95,
  homepageFetched: true,
  analyzedUrlValid: true,
  auditConfidence: 90,
  confidenceThreshold: 70,
  findings: [verifiedFinding],
  email: "hello@example.com",
  emailValidationStatus: "syntax_valid",
  doNotContact: false,
  duplicateCount: 0,
  leadStatus: "research_completed",
  approvalStatus: "approved",
  gmailMessageId: null,
};

test("valid verified website with real findings can proceed to draft", () => {
  assert.equal(evaluateAuditOutreachSafety(safeInput).allowed, true);
});

for (const [name, patch, code] of [
  ["website fetch failure", { homepageFetched: false }, "WEBSITE_FETCH_FAILED"],
  ["invalid research URL", { analyzedUrlValid: false }, "INVALID_AUDIT_URL"],
  ["no website", { websiteIdentityVerified: false }, "WEBSITE_IDENTITY_NOT_VERIFIED"],
  ["low-confidence identity", { websiteIdentityConfidence: 35 }, "LOW_WEBSITE_IDENTITY_CONFIDENCE"],
  ["missing email", { email: null }, "EMAIL_NOT_ACCEPTABLE"],
  ["duplicate lead", { duplicateCount: 1 }, "DUPLICATE_LEAD"],
  ["do-not-contact lead", { doNotContact: true }, "DO_NOT_CONTACT"],
  ["already sent lead", { gmailMessageId: "gmail-123" }, "DUPLICATE_SEND_PREVENTED"],
] as const) {
  test(`${name} is blocked with an exact reason`, () => {
    const decision = evaluateAuditOutreachSafety({ ...safeInput, ...patch });
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, code);
  });
}

const failedHomepage: HomepageEvidence = {
  fetched: false,
  requestedUrl: "",
  finalUrl: "",
  statusCode: null,
  hasHttps: null,
  title: null,
  metaDescription: null,
  h1: [],
  hasViewportMeta: null,
  canonicalUrl: null,
  hasContactCta: null,
  hasForm: null,
  htmlBytes: null,
  copyrightYear: null,
  technologyHints: [],
  brokenLinks: [],
  checkedResourceCount: 0,
  error: "invalid_research_url",
};

const failedPageSpeed = (strategy: "mobile" | "desktop"): PageSpeedEvidence => ({
  fetched: false,
  strategy,
  requestedUrl: "",
  analyzedUrl: null,
  statusCode: null,
  scores: { performance: null, seo: null, accessibility: null, bestPractices: null },
  metrics: {},
  screenshotData: null,
  error: "invalid_research_url",
});

test("failed homepage and PageSpeed never become confirmed missing-element or performance findings", () => {
  const findings = deriveVerifiedFindings(failedHomepage, failedPageSpeed("mobile"), failedPageSpeed("desktop"));
  assert.deepEqual(findings, []);
});

test("successfully fetched homepage can produce evidence-backed findings", () => {
  const findings = deriveVerifiedFindings(
    { ...failedHomepage, fetched: true, finalUrl: "https://example.com/", statusCode: 200, hasHttps: true, hasViewportMeta: false, hasContactCta: false, hasForm: false, error: null },
    failedPageSpeed("mobile"),
    failedPageSpeed("desktop"),
  );
  assert.ok(findings.some((finding) => finding.code === "MISSING_TITLE"));
  assert.ok(findings.some((finding) => finding.code === "MISSING_H1"));
  assert.ok(findings.every((finding) => finding.code !== "LOW_MOBILE_PERFORMANCE"));
});
