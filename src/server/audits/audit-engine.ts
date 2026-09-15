import "server-only";

import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { load } from "cheerio";

import type { AuditScores, WebsiteAudit } from "@/types";
import { serverEnv } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { evaluateAuditOutreachSafety } from "./audit-safety";
import { auditReportFilename, createAuditReportPdf } from "./report-pdf";
import { deriveVerifiedFindings, type HomepageEvidence, type PageSpeedEvidence } from "./audit-findings";

type Row = Record<string, unknown>;

export interface AuditRunResult {
  leadId: string;
  companyName: string;
  audit: WebsiteAudit;
  outreachAllowed: boolean;
  nextWorkflow: string | null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function isPrivateIp(address: string): boolean {
  if (address === "::1" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;
  if (!address.includes(".")) return false;
  const parts = address.split(".").map(Number);
  const first = parts[0] ?? -1;
  const second = parts[1] ?? -1;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first === 0
  );
}

async function assertPublicHttpUrl(value: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("INVALID_AUDIT_URL");
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("INVALID_AUDIT_URL");
  }
  if (parsed.hostname === "localhost" || isIP(parsed.hostname) && isPrivateIp(parsed.hostname)) {
    throw new Error("PRIVATE_NETWORK_URL_BLOCKED");
  }
  const addresses = await lookup(parsed.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("PRIVATE_NETWORK_URL_BLOCKED");
  }
  return parsed;
}

async function fetchHtml(initialUrl: string): Promise<{ response: Response; body: string; finalUrl: string; bytes: number }> {
  let current = (await assertPublicHttpUrl(initialUrl)).toString();
  for (let redirect = 0; redirect < 6; redirect += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "CodeNativeX-AuditBot/1.0 (+https://codenativex.com)",
      },
      cache: "no-store",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("REDIRECT_WITHOUT_LOCATION");
      current = (await assertPublicHttpUrl(new URL(location, current).toString())).toString();
      continue;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) throw new Error("NON_HTML_HOMEPAGE");
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > 5_000_000) throw new Error("HOMEPAGE_TOO_LARGE_TO_AUDIT");
    return { response, body: new TextDecoder().decode(buffer), finalUrl: current, bytes: buffer.byteLength };
  }
  throw new Error("TOO_MANY_REDIRECTS");
}

function absoluteHttpUrl(value: string | undefined, base: string): string | null {
  if (!value || value.startsWith("#") || /^(mailto|tel|javascript|data):/i.test(value)) return null;
  try {
    const url = new URL(value, base);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

async function inspectResources(body: string, finalUrl: string): Promise<Pick<HomepageEvidence, "brokenLinks" | "checkedResourceCount">> {
  const $ = load(body);
  const candidates = new Map<string, string>();
  $("a[href], img[src], script[src], link[href]").each((_, element) => {
    const kind = element.tagName.toLowerCase();
    const raw = $(element).attr(kind === "a" || kind === "link" ? "href" : "src");
    const resolved = absoluteHttpUrl(raw, finalUrl);
    if (!resolved || new URL(resolved).origin !== new URL(finalUrl).origin || candidates.size >= 20) return;
    candidates.set(resolved, kind);
  });

  const checked = await Promise.all(
    [...candidates.entries()].map(async ([url, kind]) => {
      try {
        const response = await fetch(url, {
          method: "HEAD",
          redirect: "manual",
          signal: AbortSignal.timeout(6_000),
          headers: { "user-agent": "CodeNativeX-AuditBot/1.0 (+https://codenativex.com)" },
          cache: "no-store",
        });
        return response.status >= 400 ? { url, status: response.status, kind } : null;
      } catch {
        return { url, status: null, kind };
      }
    }),
  );
  return { brokenLinks: checked.filter((item): item is NonNullable<typeof item> => item !== null), checkedResourceCount: candidates.size };
}

function detectTechnology(body: string): string[] {
  const checks: Array<[RegExp, string]> = [
    [/wp-content|wordpress/i, "WordPress"],
    [/cdn\.shopify\.com|shopify/i, "Shopify"],
    [/_next\/static|__next/i, "Next.js"],
    [/wixstatic|wix-code/i, "Wix"],
    [/squarespace/i, "Squarespace"],
    [/webflow/i, "Webflow"],
    [/bootstrap/i, "Bootstrap"],
    [/gtag\(|googletagmanager/i, "Google Analytics / Tag Manager"],
  ];
  return checks.filter(([pattern]) => pattern.test(body)).map(([, name]) => name);
}

async function auditHomepage(url: string): Promise<HomepageEvidence> {
  const empty: HomepageEvidence = {
    fetched: false, requestedUrl: url, finalUrl: "", statusCode: null, hasHttps: null,
    title: null, metaDescription: null, h1: [], hasViewportMeta: null, canonicalUrl: null,
    hasContactCta: null, hasForm: null, htmlBytes: null, copyrightYear: null,
    technologyHints: [], brokenLinks: [], checkedResourceCount: 0, error: null,
  };
  try {
    const { response, body, finalUrl, bytes } = await fetchHtml(url);
    if (!response.ok) return { ...empty, finalUrl, statusCode: response.status, hasHttps: finalUrl.startsWith("https://"), error: `HTTP_${response.status}` };
    const $ = load(body);
    const copyrightYears = [...body.matchAll(/(?:©|copyright[^0-9]{0,20})(20\d{2})/gi)].map((match) => Number(match[1]));
    const contactPattern = /contact|book|schedule|appointment|quote|consult/i;
    const resources = await inspectResources(body, finalUrl);
    return {
      fetched: true,
      requestedUrl: url,
      finalUrl,
      statusCode: response.status,
      hasHttps: finalUrl.startsWith("https://"),
      title: $("title").first().text().trim() || null,
      metaDescription: $('meta[name="description" i]').attr("content")?.trim() || null,
      h1: $("h1").map((_, element) => $(element).text().replace(/\s+/g, " ").trim()).get().filter(Boolean),
      hasViewportMeta: $('meta[name="viewport" i]').length > 0,
      canonicalUrl: absoluteHttpUrl($('link[rel="canonical" i]').attr("href"), finalUrl),
      hasContactCta: $("a,button").toArray().some((element) => contactPattern.test($(element).text()) || contactPattern.test($(element).attr("href") ?? "")),
      hasForm: $("form").length > 0,
      htmlBytes: bytes,
      copyrightYear: copyrightYears.length ? Math.max(...copyrightYears) : null,
      technologyHints: detectTechnology(body),
      ...resources,
      error: null,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "WEBSITE_FETCH_FAILED";
    return { ...empty, error: code };
  }
}

function lighthouseScore(category: unknown): number | null {
  if (!category || typeof category !== "object") return null;
  const score = (category as { score?: unknown }).score;
  return typeof score === "number" ? Math.round(score * 100) : null;
}

function auditNumericValue(audits: Row, id: string): number | null {
  const entry = audits[id];
  if (!entry || typeof entry !== "object") return null;
  const value = (entry as Row).numericValue;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function auditPageSpeed(url: string, strategy: "mobile" | "desktop"): Promise<PageSpeedEvidence> {
  const empty: PageSpeedEvidence = {
    fetched: false, strategy, requestedUrl: url, analyzedUrl: null, statusCode: null,
    scores: { performance: null, seo: null, accessibility: null, bestPractices: null },
    metrics: {}, screenshotData: null, error: null,
  };
  if (!serverEnv.googlePageSpeedApiKey) return { ...empty, error: "PAGESPEED_API_KEY_MISSING" };
  try {
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("strategy", strategy);
    endpoint.searchParams.set("key", serverEnv.googlePageSpeedApiKey);
    for (const category of ["performance", "seo", "accessibility", "best-practices"]) endpoint.searchParams.append("category", category);
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(45_000), cache: "no-store" });
    if (!response.ok) return { ...empty, statusCode: response.status, error: `PAGESPEED_HTTP_${response.status}` };
    const json = (await response.json()) as Row;
    const lighthouse = (json.lighthouseResult && typeof json.lighthouseResult === "object" ? json.lighthouseResult : {}) as Row;
    const categories = (lighthouse.categories && typeof lighthouse.categories === "object" ? lighthouse.categories : {}) as Row;
    const audits = (lighthouse.audits && typeof lighthouse.audits === "object" ? lighthouse.audits : {}) as Row;
    const screenshot = audits["final-screenshot"] && typeof audits["final-screenshot"] === "object" ? (audits["final-screenshot"] as Row).details : null;
    return {
      fetched: true,
      strategy,
      requestedUrl: url,
      analyzedUrl: text(lighthouse.finalUrl) || text(lighthouse.requestedUrl) || url,
      statusCode: response.status,
      scores: {
        performance: lighthouseScore(categories.performance),
        seo: lighthouseScore(categories.seo),
        accessibility: lighthouseScore(categories.accessibility),
        bestPractices: lighthouseScore(categories["best-practices"]),
      },
      metrics: {
        firstContentfulPaintMs: auditNumericValue(audits, "first-contentful-paint"),
        largestContentfulPaintMs: auditNumericValue(audits, "largest-contentful-paint"),
        totalBlockingTimeMs: auditNumericValue(audits, "total-blocking-time"),
        cumulativeLayoutShift: auditNumericValue(audits, "cumulative-layout-shift"),
        interactionToNextPaintMs: auditNumericValue(audits, "interaction-to-next-paint"),
      },
      screenshotData: screenshot && typeof screenshot === "object" ? text((screenshot as Row).data) || null : null,
      error: null,
    };
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : "PAGESPEED_FETCH_FAILED" };
  }
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? Math.round(present.reduce((sum, value) => sum + value, 0) / present.length) : null;
}

function auditScores(mobile: PageSpeedEvidence, desktop: PageSpeedEvidence): AuditScores {
  return {
    performanceMobile: mobile.scores.performance,
    performanceDesktop: desktop.scores.performance,
    seo: mobile.scores.seo ?? desktop.scores.seo,
    accessibility: mobile.scores.accessibility ?? desktop.scores.accessibility,
    bestPractices: mobile.scores.bestPractices ?? desktop.scores.bestPractices,
  };
}

async function uploadDataUrl(admin: ReturnType<typeof createSupabaseAdminClient>, path: string, dataUrl: string): Promise<string | null> {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const encoded = match[2];
  if (!mimeType || !encoded) return null;
  const bytes = Buffer.from(encoded, "base64");
  const { error } = await admin.storage.from(serverEnv.auditStorageBucket).upload(path, bytes, { contentType: mimeType, upsert: true });
  if (error) return null;
  return path;
}

export async function runWebsiteAudit(leadId: string): Promise<AuditRunResult> {
  const admin = createSupabaseAdminClient();
  const { data: leadData, error: leadError } = await admin.from("lead_pipeline").select("*").eq("id", leadId).maybeSingle();
  if (leadError) throw new Error(`Could not load audit lead: ${leadError.message}`);
  if (!leadData) throw new Error("Lead not found.");
  const lead = leadData as Row;
  const auditId = randomUUID();
  const startedAt = new Date().toISOString();

  await admin.from("lead_pipeline").update({ audit_id: auditId, audit_status: "audit_processing", audit_error_code: null, audit_error_message: null, updated_at: startedAt }).eq("id", leadId);

  const { data: candidateData } = await admin
    .from("lead_discovery_candidates")
    .select("website_verification_status, website_identity_confidence, resolved_website, website_verified_at")
    .eq("lead_key", text(lead.lead_key))
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const candidate = (candidateData ?? {}) as Row;
  const auditedUrl = text(candidate.resolved_website) || text(lead.website);
  const homepage = auditedUrl ? await auditHomepage(auditedUrl) : ({ fetched: false, requestedUrl: "", finalUrl: "", statusCode: null, hasHttps: null, title: null, metaDescription: null, h1: [], hasViewportMeta: null, canonicalUrl: null, hasContactCta: null, hasForm: null, htmlBytes: null, copyrightYear: null, technologyHints: [], brokenLinks: [], checkedResourceCount: 0, error: "NO_WEBSITE" } satisfies HomepageEvidence);
  const pageSpeedUrl = homepage.fetched ? homepage.finalUrl : auditedUrl;
  const [mobile, desktop] = pageSpeedUrl
    ? await Promise.all([auditPageSpeed(pageSpeedUrl, "mobile"), auditPageSpeed(pageSpeedUrl, "desktop")])
    : [await auditPageSpeed("", "mobile"), await auditPageSpeed("", "desktop")];
  const findings = deriveVerifiedFindings(homepage, mobile, desktop);
  const scores = auditScores(mobile, desktop);
  const coverage = (homepage.fetched ? 45 : 0) + (mobile.fetched ? 20 : 0) + (desktop.fetched ? 20 : 0) + (homepage.checkedResourceCount > 0 ? 15 : 0);
  const identityConfidence = numberValue(candidate.website_identity_confidence);
  const auditConfidence = Math.min(100, Math.round(identityConfidence * 0.55 + coverage * 0.45));
  const overallScore = average([scores.performanceMobile, scores.performanceDesktop, scores.seo, scores.accessibility, scores.bestPractices]);
  const safety = evaluateAuditOutreachSafety({
    websiteIdentityVerified: text(candidate.website_verification_status) === "verified",
    websiteIdentityConfidence: identityConfidence,
    homepageFetched: homepage.fetched,
    analyzedUrlValid: Boolean(homepage.finalUrl),
    auditConfidence,
    confidenceThreshold: serverEnv.auditConfidenceThreshold,
    findings,
    email: text(lead.email) || null,
    emailValidationStatus: text(lead.email_validation_status) || null,
    doNotContact: booleanValue(lead.do_not_contact),
    duplicateCount: numberValue(lead.duplicate_count),
    leadStatus: text(lead.status),
    approvalStatus: text(lead.approval_status),
    gmailMessageId: text(lead.gmail_message_id) || null,
  });

  const screenshotData = mobile.screenshotData ?? desktop.screenshotData;
  const screenshotPath = screenshotData ? await uploadDataUrl(admin, `${leadId}/${auditId}-screenshot.jpg`, screenshotData) : null;
  const audit: WebsiteAudit = {
    id: auditId,
    leadId,
    status: safety.status,
    auditedUrl: auditedUrl || null,
    finalUrl: homepage.finalUrl || null,
    httpStatus: homepage.statusCode,
    hasHttps: homepage.hasHttps,
    score: overallScore,
    confidence: auditConfidence,
    scores,
    findings,
    evidence: { homepage, pagespeed: { mobile: { ...mobile, screenshotData: null }, desktop: { ...desktop, screenshotData: null } } },
    screenshotUrl: screenshotPath,
    reportFilename: null,
    reportAvailable: false,
    generatedAt: null,
    errorCode: safety.code ?? homepage.error,
    errorMessage: safety.reason ?? homepage.error,
  };

  let reportPath: string | null = null;
  if (safety.allowed) {
    const filename = auditReportFilename(text(lead.company_name));
    const pdf = await createAuditReportPdf({ companyName: text(lead.company_name), audit: { ...audit, reportFilename: filename } });
    reportPath = `${leadId}/${auditId}/${filename}`;
    const { error: uploadError } = await admin.storage.from(serverEnv.auditStorageBucket).upload(reportPath, pdf, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      audit.status = "audit_needs_review";
      audit.errorCode = "REPORT_UPLOAD_FAILED";
      audit.errorMessage = uploadError.message;
    } else {
      audit.reportFilename = filename;
      audit.reportAvailable = true;
      audit.generatedAt = new Date().toISOString();
    }
  }

  const auditRow = {
    id: auditId,
    lead_id: leadId,
    status: audit.status,
    audited_url: audit.auditedUrl,
    final_url: audit.finalUrl,
    http_status: audit.httpStatus,
    has_https: audit.hasHttps,
    audit_score: audit.score,
    confidence: audit.confidence,
    scores: audit.scores,
    findings: audit.findings,
    evidence: audit.evidence,
    screenshot_path: screenshotPath,
    report_path: reportPath,
    report_filename: audit.reportFilename,
    generated_at: audit.generatedAt,
    error_code: audit.errorCode,
    error_message: audit.errorMessage,
    completed_at: new Date().toISOString(),
  };
  const { error: auditError } = await admin.from("website_audits").upsert(auditRow);
  if (auditError) throw new Error(`Could not save website audit: ${auditError.message}`);

  const successful = safety.allowed && audit.reportAvailable;
  const leadUpdate = {
    audit_id: auditId,
    audit_status: successful ? "audit_completed" : audit.status,
    audit_score: audit.score,
    audit_confidence: audit.confidence,
    audit_findings: audit.findings,
    audit_evidence: audit.evidence,
    audit_report_url: reportPath,
    audit_report_filename: audit.reportFilename,
    audit_generated_at: audit.generatedAt,
    audit_error_code: audit.errorCode,
    audit_error_message: audit.errorMessage,
    website_screenshot_url: screenshotPath,
    email_preview_status: successful ? "pending_generation" : "blocked",
    status: successful ? "email_draft_pending" : "audit_needs_review",
    next_action: successful ? "generate_evidence_email" : "manual_review",
    next_workflow: successful ? "03 - Personalized Email Outreach" : null,
    human_review_required: !successful,
    updated_at: new Date().toISOString(),
  };
  const { error: updateError } = await admin.from("lead_pipeline").update(leadUpdate).eq("id", leadId);
  if (updateError) throw new Error(`Could not update audited lead: ${updateError.message}`);

  audit.status = successful ? "audit_completed" : audit.status;
  return { leadId, companyName: text(lead.company_name), audit, outreachAllowed: successful, nextWorkflow: successful ? "03 - Personalized Email Outreach" : null };
}
