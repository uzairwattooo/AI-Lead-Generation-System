import type { AuditFinding } from "../../types/index";

export interface HomepageEvidence {
  fetched: boolean;
  requestedUrl: string;
  finalUrl: string;
  statusCode: number | null;
  hasHttps: boolean | null;
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  hasViewportMeta: boolean | null;
  canonicalUrl: string | null;
  hasContactCta: boolean | null;
  hasForm: boolean | null;
  htmlBytes: number | null;
  copyrightYear: number | null;
  technologyHints: string[];
  brokenLinks: Array<{ url: string; status: number | null; kind: string }>;
  checkedResourceCount: number;
  error: string | null;
}

export interface PageSpeedEvidence {
  fetched: boolean;
  strategy: "mobile" | "desktop";
  requestedUrl: string;
  analyzedUrl: string | null;
  statusCode: number | null;
  scores: { performance: number | null; seo: number | null; accessibility: number | null; bestPractices: number | null };
  metrics: Record<string, number | null>;
  screenshotData: string | null;
  error: string | null;
}

function finding(code: string, title: string, priority: AuditFinding["priority"], evidence: string, impact: string, recommendation: string): AuditFinding {
  return { code, title, priority, evidence, impact, recommendation };
}

export function deriveVerifiedFindings(homepage: HomepageEvidence, mobile: PageSpeedEvidence, desktop: PageSpeedEvidence, nowYear = new Date().getUTCFullYear()): AuditFinding[] {
  const findings: AuditFinding[] = [];
  if (homepage.fetched) {
    if (!homepage.hasHttps) findings.push(finding("NO_HTTPS", "Website is not served over HTTPS", "critical", `Final URL used ${(homepage.finalUrl.split(":")[0] ?? "HTTP").toUpperCase()}.`, "Browsers may show trust warnings and referral data can be lost.", "Redirect all traffic to HTTPS and renew the TLS configuration."));
    if (!homepage.title) findings.push(finding("MISSING_TITLE", "Homepage title is missing", "high", "The fetched homepage returned an empty HTML <title> element.", "Search results may have a weaker, less relevant headline.", "Add a unique title describing the company and primary service."));
    if (!homepage.metaDescription) findings.push(finding("MISSING_META_DESCRIPTION", "Meta description is missing", "medium", "No non-empty meta description was found in the fetched homepage HTML.", "Search engines may choose an unpredictable snippet.", "Write a concise, service-focused meta description."));
    if (homepage.h1.length === 0) findings.push(finding("MISSING_H1", "Homepage has no H1 heading", "high", "No non-empty H1 was found in the fetched homepage HTML.", "Visitors and search engines receive a weaker primary page signal.", "Add one clear H1 aligned with the main customer need."));
    if (homepage.h1.length > 1) findings.push(finding("MULTIPLE_H1", "Homepage has multiple H1 headings", "medium", `${homepage.h1.length} H1 headings were found.`, "The page hierarchy may be less clear to users and assistive technology.", "Use one primary H1 and move secondary headings to H2."));
    if (homepage.hasViewportMeta === false) findings.push(finding("MISSING_VIEWPORT", "Mobile viewport configuration is missing", "high", "No viewport meta tag was found in the fetched homepage HTML.", "The page may render poorly on phones.", "Add a responsive viewport meta tag and verify mobile layouts."));
    if (!homepage.canonicalUrl) findings.push(finding("MISSING_CANONICAL", "Canonical URL is not declared", "low", "No canonical link was found in the fetched homepage HTML.", "Duplicate URL variants can dilute search signals.", "Declare the preferred HTTPS homepage as canonical."));
    if (homepage.hasContactCta === false) findings.push(finding("NO_CONTACT_CTA", "No clear contact or booking CTA was detected", "high", "No contact, booking, appointment, quote, consultation, or schedule link/button was detected on the fetched homepage.", "Visitors may need extra effort to start an enquiry.", "Add one prominent, specific contact or booking action."));
    if (homepage.hasForm === false) findings.push(finding("NO_CONTACT_FORM", "No form was detected on the homepage", "low", "The fetched homepage contained no form element.", "Some visitors may leave instead of navigating to another contact channel.", "Consider a short, accessible enquiry form where appropriate."));
    if ((homepage.htmlBytes ?? 0) > 2_000_000) findings.push(finding("LARGE_HTML", "Homepage HTML payload is large", "medium", `The fetched HTML response was ${((homepage.htmlBytes ?? 0) / 1_000_000).toFixed(1)} MB.`, "Large documents can increase parsing and rendering time.", "Reduce inline payloads and defer non-critical content."));
    if (homepage.brokenLinks.length > 0) findings.push(finding("BROKEN_RESOURCES", "Broken links or resources were detected", "high", `${homepage.brokenLinks.length} of ${homepage.checkedResourceCount} sampled same-origin URLs returned an error or could not be reached.`, "Broken navigation or assets can reduce trust and block conversions.", "Repair or redirect the affected URLs and re-run the crawl."));
    if (homepage.copyrightYear !== null && homepage.copyrightYear < nowYear - 1) findings.push(finding("OUTDATED_COPYRIGHT", "Copyright year appears outdated", "low", `The latest detected copyright year was ${homepage.copyrightYear}.`, "Outdated footer content can make the website feel unattended.", "Use a current or automatically generated copyright year."));
  }
  if (mobile.fetched && mobile.scores.performance !== null && mobile.scores.performance < 60) findings.push(finding("LOW_MOBILE_PERFORMANCE", "Mobile performance needs attention", "high", `Google PageSpeed mobile performance score was ${mobile.scores.performance}/100.`, "Slow mobile experiences can increase abandonment and reduce enquiries.", "Prioritize image optimization, script reduction, caching, and Core Web Vitals."));
  if (desktop.fetched && desktop.scores.performance !== null && desktop.scores.performance < 60) findings.push(finding("LOW_DESKTOP_PERFORMANCE", "Desktop performance needs attention", "medium", `Google PageSpeed desktop performance score was ${desktop.scores.performance}/100.`, "Slow interactions can reduce engagement and conversion completion.", "Optimize the largest render-blocking assets and server response time."));
  const seo = mobile.fetched ? mobile.scores.seo : desktop.fetched ? desktop.scores.seo : null;
  if (seo !== null && seo < 80) findings.push(finding("LOW_SEO_SCORE", "Technical SEO checks need attention", "high", `Google PageSpeed SEO score was ${seo}/100.`, "Technical issues can limit discoverability and search-result quality.", "Resolve the failed Lighthouse SEO audits and validate structured metadata."));
  const accessibility = mobile.fetched ? mobile.scores.accessibility : desktop.fetched ? desktop.scores.accessibility : null;
  if (accessibility !== null && accessibility < 80) findings.push(finding("LOW_ACCESSIBILITY_SCORE", "Accessibility checks need attention", "high", `Google PageSpeed accessibility score was ${accessibility}/100.`, "Barriers may prevent some visitors from using the site and completing enquiries.", "Address contrast, labels, landmarks, keyboard navigation, and semantic structure."));
  const bestPractices = mobile.fetched ? mobile.scores.bestPractices : desktop.fetched ? desktop.scores.bestPractices : null;
  if (bestPractices !== null && bestPractices < 80) findings.push(finding("LOW_BEST_PRACTICES_SCORE", "Best-practices checks need attention", "medium", `Google PageSpeed best-practices score was ${bestPractices}/100.`, "Browser, security, or implementation warnings can reduce reliability.", "Review and resolve the failed Lighthouse best-practices audits."));
  const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  return findings.sort((a, b) => rank[a.priority] - rank[b.priority]);
}
