/**
 * Live adapter backed by Supabase Postgres.
 *
 * Table names are collected in `TABLES` so they can be renamed in one place.
 * Rows are mapped explicitly to the domain models, and any field the backend
 * does not return stays `null` rather than being invented in the UI.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PROGRESS_STAGES } from "@/types";
import type {
  ActivityEvent,
  CallQueueEntry,
  DashboardOverview,
  Lead,
  LeadNote,
  LeadSearchCriteria,
  LeadSearchProgress,
  LeadSearchRequest,
  MeetingRecord,
  OutreachRecord,
  Paginated,
  PipelineStageSummary,
  ProgressStage,
  ReplyRecord,
  WorkspaceSettings,
  WebsiteAudit,
} from "@/types";
import { PROGRESS_STAGE_LABELS } from "@/lib/constants";
import { recommendedDiscoveryIds } from "./discovery-ranking";
import { BackendNotConnectedError, type LeadFacets, type LeadQuery, type LeadRepository } from "./repository";

export const TABLES = {
  dashboardLatest: "lead_dashboard_latest",
  requests: "lead_discovery_jobs",
  progress: "lead_discovery_jobs",
  candidates: "lead_discovery_candidates",
  intakeEvents: "lead_intake_events",
  leads: "lead_pipeline",
  outreach: "lead_pipeline",
  replies: "lead_reply_events",
  meetings: "lead_meeting_events",
  callQueue: "lead_pipeline",
  activity: "lead_dashboard_activity_feed",
  notes: "lead_notes",
  settings: "lead_workspace_settings",
  audits: "website_audits",
} as const;

type Row = Record<string, unknown>;

/**
 * Minimal structural type for the PostgREST filter builder. It keeps the
 * chained query helpers typed without depending on generated database types.
 */
interface FilterBuilder extends PromiseLike<{ data: Row[] | null; error: { message: string } | null }> {
  eq(column: string, value: unknown): FilterBuilder;
  in(column: string, values: readonly unknown[]): FilterBuilder;
  order(column: string, options?: { ascending?: boolean }): FilterBuilder;
  limit(count: number): FilterBuilder;
  select(columns: string): FilterBuilder;
}

function str(row: Row, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}
function nullableStr(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
function num(row: Row, key: string, fallback = 0): number {
  const value = row[key];
  return typeof value === "number" ? value : fallback;
}
function bool(row: Row, key: string, fallback = false): boolean {
  const value = row[key];
  return typeof value === "boolean" ? value : fallback;
}
function strArray(row: Row, key: string): string[] {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function auditStatus(value: string): Lead["auditStatus"] {
  const normalized = value.toLowerCase();
  if (normalized === "audit_pending" || normalized === "audit_processing" || normalized === "audit_completed" || normalized === "audit_failed" || normalized === "audit_needs_review") return normalized;
  return "not_started";
}

function auditFindings(row: Row, key = "audit_findings"): WebsiteAudit["findings"] {
  const value = row[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WebsiteAudit["findings"][number] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const record = item as Row;
    return Boolean(str(record, "code") && str(record, "title") && str(record, "evidence"));
  });
}

function mapAudit(row: Row): WebsiteAudit {
  const scores = rowObject(row["scores"]);
  const reportPath = nullableStr(row, "report_path") ?? nullableStr(row, "audit_report_url");
  return {
    id: str(row, "id") || str(row, "audit_id"),
    leadId: str(row, "lead_id") || str(row, "id"),
    status: auditStatus(str(row, "audit_status") || str(row, "status")),
    auditedUrl: nullableStr(row, "audited_url") ?? nullableStr(row, "website"),
    finalUrl: nullableStr(row, "final_url"),
    httpStatus: typeof row["http_status"] === "number" ? num(row, "http_status") : null,
    hasHttps: typeof row["has_https"] === "boolean" ? bool(row, "has_https") : null,
    score: typeof row["audit_score"] === "number" ? num(row, "audit_score") : null,
    confidence: typeof row["confidence"] === "number" ? num(row, "confidence") : typeof row["audit_confidence"] === "number" ? num(row, "audit_confidence") : null,
    scores: {
      performanceMobile: typeof scores.performanceMobile === "number" ? num(scores, "performanceMobile") : null,
      performanceDesktop: typeof scores.performanceDesktop === "number" ? num(scores, "performanceDesktop") : null,
      seo: typeof scores.seo === "number" ? num(scores, "seo") : null,
      accessibility: typeof scores.accessibility === "number" ? num(scores, "accessibility") : null,
      bestPractices: typeof scores.bestPractices === "number" ? num(scores, "bestPractices") : null,
    },
    findings: auditFindings(row, row["findings"] ? "findings" : "audit_findings"),
    evidence: rowObject(row["evidence"] ?? row["audit_evidence"]),
    screenshotUrl: nullableStr(row, "screenshot_path") ?? nullableStr(row, "website_screenshot_url"),
    reportFilename: nullableStr(row, "report_filename") ?? nullableStr(row, "audit_report_filename"),
    reportAvailable: Boolean(reportPath),
    generatedAt: nullableStr(row, "generated_at") ?? nullableStr(row, "audit_generated_at"),
    errorCode: nullableStr(row, "error_code") ?? nullableStr(row, "audit_error_code"),
    errorMessage: nullableStr(row, "error_message") ?? nullableStr(row, "audit_error_message"),
  };
}

function rowObject(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function requestCriteria(row: Row): Row {
  const payload = rowObject(row["input_payload"]);
  const nestedCriteria = rowObject(payload["criteria"]);
  return Object.keys(nestedCriteria).length > 0 ? nestedCriteria : payload;
}

function rowArray(row: Row, key: string): Row[] {
  const value = row[key];
  return Array.isArray(value) ? value.map(rowObject) : [];
}

function dashboardRequestStatus(value: string, nextWorkflow = ""): LeadSearchRequest["status"] {
  const status = value.toLowerCase();
  if (status.includes("failed") || status.includes("error")) return "failed";
  if (status.includes("review")) return "needs_review";
  if (nextWorkflow && status.includes("completed")) return "running";
  if (status.includes("completed")) return "completed";
  if (status.includes("collecting") || status.includes("running") || status.includes("preparing")) {
    return "running";
  }
  return "queued";
}

const PROGRESS_THRESHOLDS = [0, 10, 30, 40, 50, 65, 80, 90, 100] as const;

function stageIndexFromPercent(percent: number): number {
  let index = 0;
  PROGRESS_THRESHOLDS.forEach((threshold, candidate) => {
    if (percent >= threshold) index = candidate;
  });
  return Math.min(index, PROGRESS_STAGES.length - 1);
}

function stageIndexFromBackendState(currentStage: string, percent: number): number {
  const stage = currentStage.toLowerCase();

  if (stage.includes("meeting") || stage.includes("sales_handoff")) return 7;
  if (stage.includes("reply") || stage.includes("follow_up") || stage.includes("awaiting_reply")) return 6;
  if (stage.includes("outreach")) return 5;
  if (stage.includes("research") || stage.includes("scoring")) return 4;
  if (stage.includes("lead_intake") || stage.includes("data_clean")) return 3;
  if (stage.includes("website") || stage.includes("official_domain")) return 2;
  if (
    stage.includes("google_maps") ||
    stage.includes("linkedin") ||
    stage.includes("job_platform") ||
    stage.includes("agency_collaboration") ||
    stage.includes("google_intent") ||
    stage.includes("lead_discovery") ||
    stage.includes("lead_list_ready")
  ) {
    return 1;
  }
  if (stage.includes("request")) return 0;

  return stageIndexFromPercent(percent);
}

function progressForNextWorkflow(nextWorkflow: string): number | null {
  if (nextWorkflow.startsWith("00C")) return 25;
  if (nextWorkflow.startsWith("01")) return 40;
  if (nextWorkflow.startsWith("02")) return 50;
  if (nextWorkflow.startsWith("03")) return 65;
  if (nextWorkflow.startsWith("04")) return 80;
  if (nextWorkflow.startsWith("05")) return 90;
  return null;
}

function mapDashboardRequest(row: Row): LeadSearchRequest {
  const criteria = requestCriteria(row);
  const location = str(row, "location");
  const country = str(criteria, "country") || str(row, "country");
  const category = str(row, "category") || "Lead discovery";
  const leadsFound = num(row, "businesses_found");
  const verifiedLeads = num(row, "verified_leads");

  return {
    id: str(row, "job_id"),
    source:
      str(criteria, "source") ||
      strArray(criteria, "sources")[0] ||
      strArray(row, "sources")[0] ||
      "google_maps",
    country,
    region: str(criteria, "region") || str(criteria, "state"),
    city: str(criteria, "city") || (location !== country ? location : ""),
    radiusKm: num(criteria, "radiusKm", num(criteria, "radius_km", num(row, "radius_km"))),
    categories: strArray(criteria, "categories").length
      ? strArray(criteria, "categories")
      : category
        ? [category]
        : [],
    service:
      str(criteria, "service") ||
      str(criteria, "service_interest") ||
      str(row, "service_interest") ||
      "Lead Discovery",
    leadType: str(criteria, "leadType") || str(criteria, "lead_type") || "business",
    requestedLeadCount: num(
      criteria,
      "requestedLeadCount",
      num(criteria, "lead_count", num(row, "requested_leads", Math.max(leadsFound, verifiedLeads))),
    ),
    minimumScore: num(criteria, "minimumScore", num(criteria, "minimum_score")),
    requireEmail: bool(criteria, "requireEmail", bool(criteria, "require_email")),
    requirePhone: bool(criteria, "requirePhone", bool(criteria, "require_phone")),
    requireDecisionMaker: bool(
      criteria,
      "requireDecisionMaker",
      bool(criteria, "require_decision_maker"),
    ),
    excludedDomains: strArray(criteria, "excludedDomains").length
      ? strArray(criteria, "excludedDomains")
      : strArray(criteria, "excluded_domains"),
    additionalInstructions:
      str(criteria, "additionalInstructions") || str(criteria, "additional_instructions"),
    status: dashboardRequestStatus(str(row, "status"), str(row, "next_workflow")),
    createdAt: str(row, "requested_at"),
    startedAt: nullableStr(row, "started_at"),
    completedAt: nullableStr(row, "completed_at"),
    createdBy: "automation",
    leadsFound,
    verifiedLeads,
    highPotentialLeads: 0,
    errorMessage: nullableStr(row, "error_message"),
  };
}

function mapDashboardJobActivity(row: Row): ActivityEvent {
  const status = str(row, "status");
  const completed = status.toLowerCase().includes("completed");
  const failed = status.toLowerCase().includes("failed") || status.toLowerCase().includes("error");
  const label = str(row, "category") || "Lead discovery";

  return {
    id: `job-${str(row, "job_id")}`,
    requestId: nullableStr(row, "job_id"),
    leadId: null,
    actor: "opportunity_hunter",
    action: status || "discovery_job",
    message: `${label}: ${num(row, "businesses_found")} businesses found, ${num(row, "verified_leads")} candidates created.`,
    severity: failed ? "error" : completed ? "success" : "info",
    createdAt: str(row, "completed_at") || str(row, "requested_at"),
  };
}

function mapDashboardReviewActivity(row: Row): ActivityEvent {
  const error =
    nullableStr(row, "last_research_error") ??
    nullableStr(row, "last_enrichment_error") ??
    nullableStr(row, "last_email_enrichment_error") ??
    nullableStr(row, "meeting_error");
  const company = str(row, "company_name") || "Lead";
  const status = str(row, "next_action") || str(row, "status") || "manual_review";

  return {
    id: `review-${str(row, "lead_id")}`,
    requestId: null,
    leadId: nullableStr(row, "lead_id"),
    actor: "system",
    action: status,
    message: error ? `${company}: ${error}` : `${company} requires manual review (${status}).`,
    severity: error ? "error" : "warning",
    createdAt: str(row, "updated_at"),
  };
}

function mapRequest(row: Row): LeadSearchRequest {
  const criteria = requestCriteria(row);
  const category = str(row, "category");
  const location = str(row, "location");
  const country = str(row, "country");
  return {
    id: str(row, "job_id") || str(row, "id"),
    source:
      str(criteria, "source") ||
      strArray(criteria, "sources")[0] ||
      strArray(row, "sources")[0] ||
      "google_maps",
    country: str(criteria, "country") || country,
    region: str(criteria, "region") || str(criteria, "state"),
    city: str(criteria, "city") || (location !== country ? location : ""),
    radiusKm: num(criteria, "radiusKm", num(criteria, "radius_km", num(row, "radius_km"))),
    categories: strArray(criteria, "categories").length
      ? strArray(criteria, "categories")
      : category
        ? [category]
        : [],
    service:
      str(criteria, "service") ||
      str(criteria, "service_interest") ||
      str(row, "service_interest") ||
      "Lead Discovery",
    leadType: str(criteria, "leadType") || str(criteria, "lead_type") || "business",
    requestedLeadCount: num(
      criteria,
      "requestedLeadCount",
      num(criteria, "lead_count", num(row, "requested_leads")),
    ),
    minimumScore: num(criteria, "minimumScore", num(criteria, "minimum_score")),
    requireEmail: bool(criteria, "requireEmail", bool(criteria, "require_email")),
    requirePhone: bool(criteria, "requirePhone", bool(criteria, "require_phone")),
    requireDecisionMaker: bool(
      criteria,
      "requireDecisionMaker",
      bool(criteria, "require_decision_maker"),
    ),
    excludedDomains: strArray(criteria, "excludedDomains").length
      ? strArray(criteria, "excludedDomains")
      : strArray(criteria, "excluded_domains"),
    additionalInstructions:
      str(criteria, "additionalInstructions") || str(criteria, "additional_instructions"),
    status: dashboardRequestStatus(str(row, "status"), str(row, "next_workflow")),
    createdAt: str(row, "requested_at") || str(row, "created_at"),
    startedAt: nullableStr(row, "started_at"),
    completedAt: nullableStr(row, "completed_at"),
    createdBy: str(row, "requested_by") || "automation",
    leadsFound: num(row, "businesses_found"),
    verifiedLeads: num(row, "verified_leads"),
    highPotentialLeads: num(rowObject(row["result_summary"]), "high_potential_leads"),
    errorMessage: nullableStr(row, "error_message"),
  };
}

function mapLead(row: Row): Lead {
  const emailStatus = str(row, "email_validation_status").toLowerCase();
  const enrichmentStatus = str(row, "email_enrichment_status").toLowerCase();
  const verificationStatus: Lead["verificationStatus"] =
    emailStatus === "deliverable" || emailStatus === "verified" || Boolean(row["email_verified_at"])
      ? "verified"
      : emailStatus.includes("invalid") || emailStatus.includes("undeliverable")
        ? "invalid"
        : enrichmentStatus.includes("pending") || enrichmentStatus.includes("processing")
          ? "pending"
          : "unverified";
  const contactName = nullableStr(row, "contact_name");
  const contactRole = nullableStr(row, "job_title");
  const needSignals = strArray(row, "need_signals");
  const needSignal = nullableStr(row, "need_signal");
  const opportunitySignals = needSignals.length ? needSignals : needSignal ? [needSignal] : [];
  const websiteCondition = nullableStr(row, "website_condition");
  const validationNotes = nullableStr(row, "validation_notes");
  const sourceUrl = nullableStr(row, "source_url");
  const contactSourceUrl = nullableStr(row, "contact_source_url");
  const createdAt = str(row, "created_at") || str(row, "researched_at") || str(row, "updated_at");
  const screenshotValue = nullableStr(row, "website_screenshot_url");
  const screenshotUrl = screenshotValue
    ? /^https?:\/\//i.test(screenshotValue)
      ? screenshotValue
      : `/api/leads/${str(row, "id")}/audit-screenshot`
    : null;

  return {
    id: str(row, "id"),
    candidateId: nullableStr(row, "discovery_candidate_id"),
    pipelineLeadId: str(row, "id") || null,
    requestId: str(row, "job_id"),
    companyName: str(row, "company_name"),
    category: str(row, "industry") || "Uncategorized",
    country: str(row, "country"),
    region: nullableStr(row, "region") ?? nullableStr(row, "state"),
    city: nullableStr(row, "city"),
    website: nullableStr(row, "website"),
    websiteScreenshotUrl: screenshotUrl,
    audit: str(row, "audit_id") ? mapAudit(row) : null,
    auditStatus: auditStatus(str(row, "audit_status")),
    auditScore: typeof row["audit_score"] === "number" ? num(row, "audit_score") : null,
    auditConfidence: typeof row["audit_confidence"] === "number" ? num(row, "audit_confidence") : null,
    auditBlockReason: nullableStr(row, "audit_error_message"),
    emailPreviewStatus: nullableStr(row, "email_preview_status"),
    outreachApprovedAt: nullableStr(row, "outreach_approved_at"),
    email: nullableStr(row, "email"),
    phone: nullableStr(row, "phone"),
    decisionMaker: contactName || contactRole
      ? {
          name: contactName,
          role: contactRole,
          email: nullableStr(row, "email"),
          phone: nullableStr(row, "phone"),
          profileUrl: contactSourceUrl,
        }
      : null,
    opportunitySignals,
    websiteIssues: [websiteCondition, validationNotes].filter((item): item is string => Boolean(item)),
    recommendedService: str(row, "recommended_service") || str(row, "service_interest"),
    score: num(row, "qualification_score", num(row, "data_quality_score")),
    scoreBreakdown: (row["score_breakdown"] as Lead["scoreBreakdown"]) ?? null,
    verificationStatus,
    approvalStatus: (str(row, "approval_status") || "pending") as Lead["approvalStatus"],
    rejectionReason: nullableStr(row, "rejection_reason"),
    outreachStatus: normalizeOutreachStatus(str(row, "outreach_status"), str(row, "reply_intent")),
    isRecommended: bool(row, "is_recommended"),
    recommendationRank: typeof row["recommendation_rank"] === "number" ? num(row, "recommendation_rank") : null,
    isPossibleDuplicate: str(row, "status").toLowerCase().includes("duplicate"),
    duplicateOfLeadId: nullableStr(row, "duplicate_of_lead_id"),
    sourceLinks: [
      ...(sourceUrl ? [{ label: str(row, "source") || "Lead source", url: sourceUrl, retrievedAt: createdAt || null }] : []),
      ...(contactSourceUrl && contactSourceUrl !== sourceUrl
        ? [{ label: "Contact source", url: contactSourceUrl, retrievedAt: nullableStr(row, "contact_verified_at") }]
        : []),
    ],
    verificationHistory: (row["verification_history"] as Lead["verificationHistory"]) ?? [],
    notes: (row["notes"] as Lead["notes"]) ?? [],
    discoveredAt: createdAt,
  };
}

function discoveryQuality(row: Row): number {
  return (nullableStr(row, "email") ? 4 : 0)
    + (nullableStr(row, "website") || nullableStr(row, "resolved_website") ? 3 : 0)
    + (nullableStr(row, "phone") ? 2 : 0)
    + (nullableStr(row, "source_url") ? 1 : 0);
}

function mapCandidateLead(candidate: Row, pipeline?: Row): Lead {
  const pipelineId = pipeline ? str(pipeline, "id") : "";
  const candidateId = str(candidate, "id");
  const merged: Row = {
    ...candidate,
    ...(pipeline ?? {}),
    id: pipelineId || candidateId,
    discovery_candidate_id: candidateId,
    job_id: str(candidate, "job_id"),
    lead_key: str(candidate, "lead_key") || (pipeline ? str(pipeline, "lead_key") : ""),
    company_name: (pipeline ? str(pipeline, "company_name") : "") || str(candidate, "company_name"),
    website:
      (pipeline ? nullableStr(pipeline, "website") : null)
      ?? nullableStr(candidate, "resolved_website")
      ?? nullableStr(candidate, "website"),
    email: (pipeline ? nullableStr(pipeline, "email") : null) ?? nullableStr(candidate, "email"),
    phone: (pipeline ? nullableStr(pipeline, "phone") : null) ?? nullableStr(candidate, "phone"),
    industry: (pipeline ? str(pipeline, "industry") : "") || str(candidate, "industry") || str(candidate, "category"),
    country: (pipeline ? str(pipeline, "country") : "") || str(candidate, "country"),
    region:
      (pipeline ? nullableStr(pipeline, "region") ?? nullableStr(pipeline, "state") : null)
      ?? nullableStr(candidate, "region")
      ?? nullableStr(candidate, "state"),
    city: (pipeline ? nullableStr(pipeline, "city") : null) ?? nullableStr(candidate, "city"),
    source: (pipeline ? str(pipeline, "source") : "") || str(candidate, "source"),
    source_url: (pipeline ? nullableStr(pipeline, "source_url") : null) ?? nullableStr(candidate, "source_url"),
    contact_name: (pipeline ? nullableStr(pipeline, "contact_name") : null) ?? nullableStr(candidate, "contact_name"),
    job_title: (pipeline ? nullableStr(pipeline, "job_title") : null) ?? nullableStr(candidate, "job_title"),
    service_interest: (pipeline ? str(pipeline, "service_interest") : "") || str(candidate, "service_interest"),
    approval_status:
      (pipeline ? str(pipeline, "approval_status") : "")
      || str(candidate, "review_status")
      || "pending",
    qualification_score:
      pipeline && typeof pipeline["qualification_score"] === "number"
        ? num(pipeline, "qualification_score")
        : discoveryQuality(candidate) * 10,
    created_at: str(candidate, "created_at") || (pipeline ? str(pipeline, "created_at") : ""),
    is_recommended: bool(candidate, "is_recommended"),
    recommendation_rank: candidate["recommendation_rank"],
  };
  const lead = mapLead(merged);
  return {
    ...lead,
    candidateId,
    pipelineLeadId: pipelineId || null,
    isRecommended: bool(candidate, "is_recommended"),
    recommendationRank:
      typeof candidate["recommendation_rank"] === "number"
        ? num(candidate, "recommendation_rank")
        : null,
  };
}

function normalizeOutreachStatus(value: string, replyIntent = ""): Lead["outreachStatus"] {
  const status = value.toLowerCase();
  const intent = replyIntent.toLowerCase();
  if (status.includes("do_not_contact") || intent === "do_not_contact") return "do_not_contact";
  if (status.includes("blocked")) return "outreach_blocked";
  if (status.includes("failed")) return "outreach_failed";
  if (status.includes("awaiting_reply")) return "awaiting_reply";
  if (status.includes("awaiting_approval")) return "awaiting_approval";
  if (status.includes("draft_ready") || status === "draft") return "email_draft_ready";
  if (status.includes("meeting") || intent === "meeting_request") return "meeting_booked";
  if (intent === "interested" || intent === "pricing_question") return "interested";
  if (intent === "not_interested") return "not_interested";
  if (status.includes("review") || intent === "unclear") return "needs_human_review";
  if (status.includes("calling") || status.includes("call_queue")) return "calling_queue";
  if (status.includes("follow_up_3") || status.includes("followup_3")) return "follow_up_3";
  if (status.includes("follow_up_2") || status.includes("followup_2")) return "follow_up_2";
  if (status.includes("follow_up_1") || status.includes("followup_1")) return "follow_up_1";
  if (status.includes("replied") || status.includes("reply")) return "replied";
  if (status.includes("sent") || status.includes("waiting_follow")) return "initial_email_sent";
  if (status.includes("queue") || status.includes("ready") || status.includes("pending")) return "queued";
  return "not_queued";
}

function mapOutreach(row: Row): OutreachRecord {
  const leadId = str(row, "id") || str(row, "lead_id");
  const initialSubject = str(row, "outreach_subject");
  const initialBody = str(row, "outreach_body");
  const initialHtmlBody = nullableStr(row, "outreach_html_body");
  const initialSentAt = nullableStr(row, "first_outreach_at") ?? nullableStr(row, "last_outreach_at");
  const followUpBody = str(row, "last_follow_up_body");
  const followUpCount = num(row, "follow_up_count");
  const rawOutreachStatus = str(row, "outreach_status").toLowerCase();
  const requiresCopyApproval =
    bool(row, "human_review_required") || rawOutreachStatus.includes("approval");
  const messages: OutreachRecord["messages"] = [];

  if (initialSubject || initialBody) {
    messages.push({
      id: `initial-${leadId}`,
      step: "initial",
      subject: initialSubject,
      body: initialBody,
      htmlBody: initialHtmlBody,
      status: initialSentAt || str(row, "gmail_message_id")
        ? "sent"
        : requiresCopyApproval
          ? "awaiting_approval"
          : "draft",
      sentAt: initialSentAt,
    });
  }

  if (followUpBody) {
    const step = Math.min(Math.max(followUpCount, 1), 3) as 1 | 2 | 3;
    messages.push({
      id: `follow-up-${step}-${leadId}`,
      step: `follow_up_${step}` as "follow_up_1" | "follow_up_2" | "follow_up_3",
      subject: initialSubject ? `Re: ${initialSubject}` : "Follow-up",
      body: followUpBody,
      htmlBody: null,
      status: nullableStr(row, "last_follow_up_at") ? "sent" : "draft",
      sentAt: nullableStr(row, "last_follow_up_at"),
    });
  }

  return {
    id: leadId,
    leadId,
    companyName: str(row, "company_name"),
    email: nullableStr(row, "email"),
    status: normalizeOutreachStatus(str(row, "outreach_status"), str(row, "reply_intent")),
    messages,
    lastContactedAt: nullableStr(row, "last_outreach_at") ?? nullableStr(row, "last_follow_up_at"),
    nextActionAt: nullableStr(row, "next_follow_up_at"),
    requiresApproval: requiresCopyApproval,
    auditStatus: auditStatus(str(row, "audit_status")),
    auditScore: typeof row["audit_score"] === "number" ? num(row, "audit_score") : null,
    auditReportAvailable: Boolean(nullableStr(row, "audit_report_url")),
    auditReportFilename: nullableStr(row, "audit_report_filename"),
    auditBlockReason: nullableStr(row, "audit_error_message") ?? nullableStr(row, "last_outreach_error"),
    gmailMessageId: nullableStr(row, "gmail_message_id"),
    gmailThreadId: nullableStr(row, "gmail_thread_id"),
    updatedAt: str(row, "updated_at") || str(row, "created_at"),
  };
}

function mapReply(row: Row): ReplyRecord {
  const rawConfidence = num(row, "confidence", num(row, "reply_confidence"));
  return {
    id: str(row, "id") || str(row, "incoming_message_id"),
    leadId: str(row, "lead_id"),
    outreachId: str(row, "outreach_id") || str(row, "gmail_thread_id"),
    companyName: str(row, "company_name"),
    fromEmail: str(row, "from_email"),
    subject: str(row, "subject"),
    body: str(row, "reply_text") || str(row, "body"),
    classification: (str(row, "reply_intent") || str(row, "classification") || "unclear") as ReplyRecord["classification"],
    confidence: rawConfidence > 1 ? rawConfidence / 100 : rawConfidence,
    requiresHumanReview: bool(row, "human_review_required", bool(row, "requires_human_review")),
    handled: bool(row, "handled"),
    receivedAt: str(row, "received_at"),
  };
}

function mapMeeting(row: Row): MeetingRecord {
  const start = nullableStr(row, "meeting_start_at") ?? nullableStr(row, "selected_slot");
  const end = nullableStr(row, "meeting_end_at");
  const duration = start && end
    ? Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000))
    : 30;
  const rawStatus = str(row, "meeting_status").toLowerCase();
  const status: MeetingRecord["status"] = rawStatus.includes("cancel")
    ? "cancelled"
    : rawStatus.includes("complete")
      ? "completed"
      : rawStatus.includes("book") || rawStatus.includes("schedul")
        ? "scheduled"
        : "requested";
  return {
    id: str(row, "id") || str(row, "meeting_processing_id"),
    leadId: str(row, "lead_id"),
    companyName: str(row, "company_name"),
    contactName: nullableStr(row, "contact_name"),
    contactEmail: nullableStr(row, "client_email") ?? nullableStr(row, "contact_email"),
    status,
    scheduledFor: start,
    durationMinutes: duration,
    meetingTimezone: nullableStr(row,"meeting_timezone") ?? undefined,
    meetingUrl: nullableStr(row, "meeting_link") ?? nullableStr(row, "calendar_event_url"),
    notes: nullableStr(row, "error_message") ?? (str(row, "provider") === "google_meet" ? `Google Meet · ${str(row, "meeting_timezone") || "UTC"}${str(row, "meeting_link") ? "" : " · conferencing link pending"}` : nullableStr(row, "sales_handoff_status")),
    createdAt: str(row, "created_at"),
  };
}

function mapActivity(row: Row): ActivityEvent {
  return {
    id: str(row, "id"),
    requestId: nullableStr(row, "request_id"),
    leadId: nullableStr(row, "lead_id"),
    actor: (str(row, "actor") || "system") as ActivityEvent["actor"],
    action: str(row, "action"),
    message: str(row, "message"),
    severity: (str(row, "severity") || "info") as ActivityEvent["severity"],
    createdAt: str(row, "created_at"),
  };
}

function mapCallQueue(row: Row): CallQueueEntry {
  return {
    id: `call-${str(row, "id")}`,
    leadId: str(row, "id"),
    companyName: str(row, "company_name"),
    phone: nullableStr(row, "phone"),
    reason: str(row, "next_action") || "Phone follow-up required",
    priority: (str(row, "lead_priority") || "normal") as CallQueueEntry["priority"],
    queuedAt: str(row, "updated_at") || str(row, "created_at"),
  };
}

const DEFAULT_SETTINGS: WorkspaceSettings = {
  autoApproveLeads: false,
  minimumApprovalScore: 70,
  requireEmailBeforeOutreach: true,
  requireOutreachCopyApproval: true,
  dailyOutreachLimit: 100,
  followUpCount: 3,
  followUpIntervalDays: 4,
  notifyOnNeedsReview: true,
  senderName: "",
  senderEmail: "",
};

export class SupabaseAdapter implements LeadRepository {
  readonly mode = "live" as const;
  private readonly client: SupabaseClient;
  private readonly userEmail: string;

  constructor(client: SupabaseClient, userEmail: string) {
    this.client = client;
    this.userEmail = userEmail;
  }

  /**
   * Runs a select against `table`. `build` receives the PostgREST filter
   * builder so callers can chain `eq`, `order`, `limit` and friends.
   */
  private async rows(
    table: string,
    build?: (query: FilterBuilder) => FilterBuilder,
  ): Promise<Row[]> {
    const query = this.client.from(table).select("*") as unknown as FilterBuilder;
    const { data, error } = (await (build ? build(query) : query)) as {
      data: Row[] | null;
      error: { message: string } | null;
    };
    if (error) throw new Error(`Supabase query on "${table}" failed: ${error.message}`);
    return data ?? [];
  }

  async getOverview(): Promise<DashboardOverview> {
    const [snapshot] = await this.rows(TABLES.dashboardLatest, (query) => query.limit(1));
    if (!snapshot) {
      throw new Error(
        "No dashboard snapshot is available. Run the Final Dashboard & Reporting workflow once.",
      );
    }

    const metrics = rowObject(snapshot["metrics"]);
    const pipeline: PipelineStageSummary[] = rowArray(snapshot, "pipeline").map((stage) => ({
      stage: str(stage, "stage"),
      count: num(stage, "count"),
    }));
    const outreachSummary: PipelineStageSummary[] = rowArray(snapshot, "outreach_summary").map(
      (stage) => ({
        stage: str(stage, "stage"),
        count: num(stage, "count"),
      }),
    );
    const recentJobs = rowArray(snapshot, "recent_jobs");
    const reviewItems = rowArray(snapshot, "review_items");

    return {
      metrics: {
        totalLeadsFound: num(metrics, "totalLeadsFound"),
        verifiedLeads: num(metrics, "verifiedLeads"),
        highPotentialLeads: num(metrics, "highPotentialLeads"),
        pendingApproval: num(metrics, "pendingApproval"),
        emailsSent: num(metrics, "emailsSent"),
        repliesReceived: num(metrics, "repliesReceived"),
        meetingsBooked: num(metrics, "meetingsBooked"),
      },
      recentRequests: recentJobs.map(mapDashboardRequest),
      pipeline,
      recentActivity: recentJobs.map(mapDashboardJobActivity).slice(0, 8),
      outreachSummary,
      itemsNeedingReview: reviewItems.map(mapDashboardReviewActivity).slice(0, 5),
    };
  }

  async listRequests(): Promise<LeadSearchRequest[]> {
    const rows = await this.rows(TABLES.requests);
    return rows.map(mapRequest).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async getRequest(id: string): Promise<LeadSearchRequest | null> {
    const { data, error } = await this.client.from(TABLES.requests).select("*").eq("job_id", id).maybeSingle();
    if (error) throw new Error(`Supabase query on "${TABLES.requests}" failed: ${error.message}`);
    return data ? mapRequest(data as Row) : null;
  }

  async createRequest(criteria: LeadSearchCriteria, createdBy: string): Promise<LeadSearchRequest> {
    const jobId = `dashboard-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const source = criteria.source || "google_maps";
    const location = [criteria.city, criteria.region, criteria.country].filter(Boolean).join(", ");
    const { data, error } = await this.client
      .from(TABLES.requests)
      .insert({
        job_id: jobId,
        client_request_id: jobId,
        request_fingerprint: `dashboard-${jobId}`,
        requested_by: createdBy,
        location,
        country: criteria.country,
        category: criteria.categories.join(", ") || "Web development leads",
        requested_leads: criteria.requestedLeadCount,
        sources: [source],
        service_interest: criteria.service,
        language: "en",
        priority: "normal",
        include_service_area_businesses: true,
        status: "queued",
        current_stage: "request_queued",
        progress_percent: 0,
        businesses_found: 0,
        verified_leads: 0,
        duplicates_removed: 0,
        rejected_leads: 0,
        attempt_count: 0,
        max_attempts: 3,
        input_payload: {
          mode: "dashboard",
          processing_mode: "human_review",
          stop_after_discovery: true,
          keep_all_discovered: true,
          recommended_lead_count: 2,
          criteria,
        },
        requested_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new Error(`Could not create the lead request: ${error.message}`);
    return mapRequest(data as Row);
  }

  private async patchRequest(id: string, patch: Row): Promise<LeadSearchRequest> {
    const { data, error } = await this.client
      .from(TABLES.requests)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("job_id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Could not update the lead request: ${error.message}`);
    return mapRequest(data as Row);
  }

  async cancelRequest(id: string): Promise<LeadSearchRequest> {
    return this.patchRequest(id, { status: "cancelled", completed_at: new Date().toISOString() });
  }

  async retryRequest(id: string): Promise<LeadSearchRequest> {
    return this.patchRequest(id, {
      status: "queued",
      current_stage: "request_queued",
      progress_percent: 0,
      error_message: null,
      started_at: new Date().toISOString(),
      completed_at: null,
    });
  }

  async getProgress(id: string): Promise<LeadSearchProgress | null> {
    const { data, error } = await this.client
      .from(TABLES.progress)
      .select("*")
      .eq("job_id", id)
      .maybeSingle();
    if (error) throw new Error(`Supabase query on "${TABLES.progress}" failed: ${error.message}`);
    if (!data) return null;

    const row = data as Row;
    const request = mapRequest(row);

    const activityRows = await this.rows(TABLES.activity, (query) => query.eq("request_id", id));
    const timeline = activityRows
      .map(mapActivity)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    const nextWorkflow = str(row, "next_workflow");
    const savedPercent = Math.max(0, Math.min(100, num(row, "progress_percent")));
    const recoveredPercent = progressForNextWorkflow(nextWorkflow);
    const percentComplete = nextWorkflow && savedPercent >= 100 && recoveredPercent !== null
      ? recoveredPercent
      : savedPercent;
    const backendStage = str(row, "current_stage");
    const backendStageIndex = stageIndexFromBackendState(backendStage, percentComplete);
    const lastStageIndex = PROGRESS_STAGES.length - 1;
    const terminal = !nextWorkflow && (
      percentComplete >= 100 ||
      ["completed", "needs_review", "failed", "cancelled"].includes(request.status)
    );
    const failed = request.status === "failed";
    const activeIndex = terminal ? lastStageIndex : backendStageIndex;
    const stages: ProgressStage[] = PROGRESS_STAGES.map((key, index) => {
      let status: ProgressStage["status"] = "pending";

      if (terminal) {
        if (index === lastStageIndex) status = failed ? "failed" : "completed";
        else if (index <= backendStageIndex) status = "completed";
        else status = "skipped";
      } else if (index < activeIndex) status = "completed";
      else if (index === activeIndex) status = failed ? "failed" : "active";

      return {
        key,
        label: PROGRESS_STAGE_LABELS[key],
        status,
        startedAt: index <= activeIndex ? request.startedAt ?? request.createdAt : null,
        completedAt: status === "completed" ? request.completedAt : null,
        detail: index === activeIndex && backendStage ? backendStage.replaceAll("_", " ") : null,
      };
    });

    const startedAt = request.startedAt ?? request.createdAt;

    return {
      requestId: id,
      status: nextWorkflow && request.status === "completed" ? "running" : request.status,
      percentComplete,
      currentStage: PROGRESS_STAGES[activeIndex] as LeadSearchProgress["currentStage"],
      stages,
      sourcesChecked: strArray(row, "sources").length,
      businessesDiscovered: num(row, "businesses_found"),
      duplicatesRemoved: num(row, "duplicates_removed"),
      invalidContactsRejected: num(row, "rejected_leads"),
      verifiedLeads: num(row, "verified_leads", request.verifiedLeads),
      highPotentialLeads: request.highPotentialLeads,
      startedAt: request.startedAt,
      updatedAt: str(row, "updated_at") || new Date().toISOString(),
      elapsedSeconds: Math.max(
        0,
        Math.floor((Date.parse(request.completedAt ?? new Date().toISOString()) - Date.parse(startedAt)) / 1000),
      ),
      errorMessage: request.errorMessage,
      timeline,
    };
  }

  async listLeads(query: LeadQuery): Promise<Paginated<Lead> & { facets: LeadFacets }> {
    const candidateRows = await this.rows(TABLES.candidates, (candidateQuery) => {
      let scoped = candidateQuery.limit(5000).order("created_at", { ascending: false });
      if (query.requestId) scoped = scoped.eq("job_id", query.requestId);
      return scoped;
    });

    const candidateLeadKeys = [...new Set(candidateRows.map((row) => str(row, "lead_key")).filter(Boolean))];
    const pipelineRows: Row[] = [];
    for (let offset = 0; offset < candidateLeadKeys.length; offset += 200) {
      const keys = candidateLeadKeys.slice(offset, offset + 200);
      pipelineRows.push(...await this.rows(TABLES.leads, (leadQuery) => leadQuery.in("lead_key", keys)));
    }
    if (!query.requestId) {
      const legacyRows = await this.rows(TABLES.leads, (leadQuery) =>
        leadQuery.limit(5000).order("created_at", { ascending: false }),
      );
      const knownIds = new Set(pipelineRows.map((row) => str(row, "id")));
      pipelineRows.push(...legacyRows.filter((row) => !knownIds.has(str(row, "id"))));
    }

    const pipelineByLeadKey = new Map(
      pipelineRows
        .map((row) => [str(row, "lead_key"), row] as const)
        .filter(([leadKey]) => Boolean(leadKey)),
    );
    const candidatePipelineIds = new Set(
      candidateRows
        .map((row) => pipelineByLeadKey.get(str(row, "lead_key")))
        .filter((row): row is Row => Boolean(row))
        .map((row) => str(row, "id")),
    );

    let allLeads = [
      ...candidateRows.map((candidate) => mapCandidateLead(candidate, pipelineByLeadKey.get(str(candidate, "lead_key")))),
      ...(!query.requestId
        ? pipelineRows.filter((row) => !candidatePipelineIds.has(str(row, "id"))).map(mapLead)
        : []),
    ];

    // The migration stores the top two ranks. This fallback keeps older rows
    // useful before the migration has ranked them; no lead is removed.
    const groups = new Map<string, Lead[]>();
    for (const lead of allLeads) {
      const group = groups.get(lead.requestId) ?? [];
      group.push(lead);
      groups.set(lead.requestId, group);
    }
    allLeads = allLeads.map((lead) => {
      if (lead.isRecommended || lead.pipelineLeadId && !lead.candidateId) return lead;
      const group = groups.get(lead.requestId) ?? [];
      const rank = recommendedDiscoveryIds(group).get(lead.id) ?? null;
      return rank ? { ...lead, isRecommended: true, recommendationRank: rank } : lead;
    });

    const search = query.search?.trim().toLowerCase();
    const contactFilters = new Set(query.contact ?? []);
    const filtered = allLeads.filter((lead) => {
      if (query.categories?.length && !query.categories.includes(lead.category)) return false;
      if (query.verification?.length && !query.verification.includes(lead.verificationStatus)) return false;
      if (query.outreach?.length && !query.outreach.includes(lead.outreachStatus)) return false;
      if (query.approval?.length && !query.approval.includes(lead.approvalStatus)) return false;
      if (query.recommendedOnly && !lead.isRecommended) return false;
      if (contactFilters.has("has_email") && !lead.email) return false;
      if (contactFilters.has("has_phone") && !lead.phone) return false;
      if (contactFilters.has("has_website") && !lead.website) return false;
      if (contactFilters.has("missing_email") && lead.email) return false;
      if (contactFilters.has("missing_phone") && lead.phone) return false;
      if (contactFilters.has("missing_website") && lead.website) return false;
      if (query.location) {
        const location = `${lead.city ?? ""} ${lead.region ?? ""} ${lead.country}`.toLowerCase();
        if (!location.includes(query.location.toLowerCase())) return false;
      }
      if (search) {
        const haystack = [
          lead.companyName,
          lead.category,
          lead.email ?? "",
          lead.phone ?? "",
          lead.website ?? "",
          lead.city ?? "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const direction = query.sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      switch (query.sortBy) {
        case "companyName":
          return a.companyName.localeCompare(b.companyName) * direction;
        case "category":
          return a.category.localeCompare(b.category) * direction;
        case "location":
          return `${a.city ?? ""}${a.country}`.localeCompare(`${b.city ?? ""}${b.country}`) * direction;
        case "discoveredAt":
          return (Date.parse(a.discoveredAt) - Date.parse(b.discoveredAt)) * direction;
        case "recommended":
        default:
          return ((a.recommendationRank ?? 9999) - (b.recommendationRank ?? 9999)) * (query.sortDir === "asc" ? -1 : 1);
      }
    });

    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
      facets: {
        categories: [...new Set(allLeads.map((lead) => lead.category).filter(Boolean))].sort(),
        locations: [...new Set(allLeads.map((lead) => lead.city ?? lead.country).filter(Boolean))].sort(),
      },
    };
  }

  async getLead(id: string): Promise<Lead | null> {
    const { data: pipelineData, error: pipelineError } = await this.client.from(TABLES.leads).select("*").eq("id", id).maybeSingle();
    if (pipelineError) throw new Error(`Supabase query on "${TABLES.leads}" failed: ${pipelineError.message}`);
    const { data: candidateData, error: candidateError } = await this.client.from(TABLES.candidates).select("*").eq("id", id).maybeSingle();
    if (candidateError) throw new Error(`Supabase query on "${TABLES.candidates}" failed: ${candidateError.message}`);

    let pipeline = pipelineData as Row | null;
    let candidate = candidateData as Row | null;
    if (pipeline && !candidate) {
      const leadKey = str(pipeline, "lead_key");
      if (leadKey) {
        const { data, error } = await this.client.from(TABLES.candidates).select("*").eq("lead_key", leadKey).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!error && data) candidate = data as Row;
      }
    }
    if (candidate && !pipeline) {
      const leadKey = str(candidate, "lead_key");
      if (leadKey) {
        const { data, error } = await this.client.from(TABLES.leads).select("*").eq("lead_key", leadKey).maybeSingle();
        if (!error && data) pipeline = data as Row;
      }
    }
    if (!pipeline && !candidate) return null;
    const lead = candidate ? mapCandidateLead(candidate, pipeline ?? undefined) : mapLead(pipeline as Row);
    if (!pipeline) return lead;
    const pipelineId = str(pipeline, "id");
    const notes = await this.rows(TABLES.notes, (query) =>
      query.eq("lead_id", pipelineId).order("created_at", { ascending: false }),
    );
    let audit = lead.audit;
    const { data: auditData, error: auditError } = await this.client
      .from(TABLES.audits)
      .select("*")
      .eq("lead_id", pipelineId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!auditError && auditData) audit = mapAudit(auditData as Row);
    return {
      ...lead,
      audit,
      notes: notes.map((row) => ({
        id: str(row, "id"),
        author: str(row, "author"),
        body: str(row, "body"),
        createdAt: str(row, "created_at"),
      })),
    };
  }

  async setApproval(
    ids: string[],
    approval: "approved" | "rejected",
    rejectionReason?: string,
  ): Promise<Lead[]> {
    const now = new Date().toISOString();
    const pipelineRows = await this.rows(TABLES.leads, (query) => query.in("id", ids));
    const candidateRows = await this.rows(TABLES.candidates, (query) => query.in("id", ids));
    const pipelineIds = pipelineRows.map((row) => str(row, "id"));
    const candidateIds = candidateRows.map((row) => str(row, "id"));
    const candidateLeadKeys = candidateRows.map((row) => str(row, "lead_key")).filter(Boolean);

    if (pipelineIds.length) {
      const { error } = await this.client.from(TABLES.leads).update({
        approval_status: approval,
        rejection_reason: approval === "rejected" ? (rejectionReason ?? null) : null,
        approved_by: this.userEmail,
        updated_at: now,
      }).in("id", pipelineIds);
      if (error) throw new Error(`Could not update lead approval: ${error.message}`);
    }
    if (candidateLeadKeys.length) {
      const { error } = await this.client.from(TABLES.leads).update({
        approval_status: approval,
        rejection_reason: approval === "rejected" ? (rejectionReason ?? null) : null,
        approved_by: this.userEmail,
        updated_at: now,
      }).in("lead_key", candidateLeadKeys);
      if (error) throw new Error(`Could not update linked lead approval: ${error.message}`);
    }
    if (candidateIds.length) {
      const { error } = await this.client.from(TABLES.candidates).update({
        review_status: approval,
        review_reason: approval === "rejected" ? (rejectionReason ?? null) : null,
        reviewed_by: this.userEmail,
        reviewed_at: now,
        updated_at: now,
      }).in("id", candidateIds);
      if (error) throw new Error(`Could not update discovery review: ${error.message}. Run the human-review migration first.`);
    }

    const updated = await Promise.all(ids.map((leadId) => this.getLead(leadId)));
    return updated.filter((lead): lead is Lead => Boolean(lead));
  }

  async sendToOutreach(
    ids: string[],
    options: import("@/types").OutreachPreparationOptions = {
      prepareAuditReport: true,
      enableBookingLink: true,
    },
  ): Promise<OutreachRecord[]> {
    const pipelineRows = await this.rows(TABLES.leads, (query) => query.in("id", ids));
    const candidateRows = await this.rows(TABLES.candidates, (query) => query.in("id", ids));
    const promotedIds: string[] = [];

    for (const candidate of candidateRows) {
      if (str(candidate, "review_status") !== "approved" || !nullableStr(candidate, "email")) continue;
      const { data, error } = await this.client.rpc("codenativex_promote_discovery_candidate", {
        p_candidate_id: str(candidate, "id"),
        p_reviewed_by: this.userEmail,
        p_prepare_report: options.prepareAuditReport,
        p_enable_booking: options.enableBookingLink,
      });
      if (error) throw new Error(`Could not prepare discovered lead for outreach: ${error.message}. Run the human-review migration first.`);
      if (typeof data === "string") promotedIds.push(data);
    }

    const rows = [
      ...pipelineRows,
      ...(promotedIds.length ? await this.rows(TABLES.leads, (query) => query.in("id", promotedIds)) : []),
    ];
    const eligibleIds = [...new Set(rows
      .filter((row) => str(row, "approval_status") === "approved")
      .filter((row) => Boolean(nullableStr(row, "email")))
      .filter((row) => !bool(row, "do_not_contact"))
      .filter((row) => num(row, "duplicate_count") === 0)
      .filter((row) => !str(row, "gmail_message_id"))
      .map((row) => str(row, "id")))];
    if (eligibleIds.length === 0) return [];
    const { data, error } = await this.client
      .from(TABLES.leads)
      .update({
        audit_status: "audit_pending",
        outreach_status: "not_started",
        status: "audit_pending",
        next_action: "run_verified_website_audit",
        next_workflow: "02A - Website Audit & Branded Report Generator",
        audit_error_code: null,
        audit_error_message: null,
        email_preview_status: null,
        outreach_prepare_report: options.prepareAuditReport,
        outreach_enable_booking_link: options.enableBookingLink,
        updated_at: new Date().toISOString(),
      })
      .in("id", eligibleIds)
      .select("*");
    if (error) throw new Error(`Could not queue leads for outreach: ${error.message}`);
    return (data as Row[]).map(mapOutreach);
  }

  async addNote(leadId: string, body: string, author: string): Promise<LeadNote> {
    const { data, error } = await this.client
      .from(TABLES.notes)
      .insert({ lead_id: leadId, body, author })
      .select("*")
      .single();
    if (error) throw new Error(`Could not save the note: ${error.message}`);
    const row = data as Row;
    return {
      id: str(row, "id"),
      author: str(row, "author"),
      body: str(row, "body"),
      createdAt: str(row, "created_at"),
    };
  }

  async listOutreach(): Promise<OutreachRecord[]> {
    const rows = await this.rows(TABLES.outreach);
    return rows
      .map(mapOutreach)
      .filter((record) => record.status !== "not_queued" || record.messages.length > 0)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async approveOutreachMessage(outreachId: string, messageId: string): Promise<OutreachRecord> {
    const [sourceRow] = await this.rows(TABLES.outreach, (query) => query.eq("id", outreachId));
    const record = sourceRow ? mapOutreach(sourceRow) : null;
    if (!record) throw new BackendNotConnectedError(`outreach/${outreachId}`);
    if (!sourceRow) throw new BackendNotConnectedError(`outreach/${outreachId}`);
    if (!record.messages.some((message) => message.id === messageId)) {
      throw new BackendNotConnectedError(`outreach/${outreachId}/messages/${messageId}`);
    }
    if (str(sourceRow, "audit_status") !== "audit_completed" || !str(sourceRow, "audit_report_url")) {
      throw new Error("This email cannot be approved until a verified audit and PDF report are complete.");
    }
    if (bool(sourceRow, "do_not_contact") || num(sourceRow, "duplicate_count") > 0 || str(sourceRow, "gmail_message_id")) {
      throw new Error("This outreach is blocked by contact safety or duplicate-send protection.");
    }

    const { data, error } = await this.client
      .from(TABLES.outreach)
      .update({
        human_review_required: false,
        outreach_status: "queued",
        status: "outreach_queued",
        next_action: "send_personalized_email",
        next_workflow: "03 - Personalized Evidence-Based Email Outreach",
        email_preview_status: "approved",
        outreach_approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_by: this.userEmail,
      })
      .eq("id", outreachId)
      .select("*")
      .single();
    if (error) throw new Error(`Could not approve the outreach message: ${error.message}`);
    return mapOutreach(data as Row);
  }

  async listReplies(): Promise<ReplyRecord[]> {
    const rows = await this.rows(TABLES.replies);
    const leadIds = [...new Set(rows.map((row) => str(row, "lead_id")).filter(Boolean))];
    const leadRows = leadIds.length
      ? await this.rows(TABLES.leads, (query) => query.in("id", leadIds))
      : [];
    const companyByLeadId = new Map(
      leadRows.map((row) => [str(row, "id"), str(row, "company_name")]),
    );
    return rows
      .map((row) =>
        mapReply({
          ...row,
          company_name:
            str(row, "company_name") || companyByLeadId.get(str(row, "lead_id")) || "Unknown lead",
        }),
      )
      .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  }

  async markReplyHandled(replyId: string, handled: boolean): Promise<ReplyRecord> {
    const { data, error } = await this.client
      .from(TABLES.replies)
      .update({
        handled,
        handled_by: handled ? this.userEmail : null,
        handled_at: handled ? new Date().toISOString() : null,
      })
      .eq("id", replyId)
      .select("*")
      .single();
    if (error) throw new Error(`Could not update the reply: ${error.message}`);
    return mapReply(data as Row);
  }

  async listMeetings(): Promise<MeetingRecord[]> {
    const [legacyRows, calendlyRows] = await Promise.all([
      this.rows(TABLES.meetings),
      this.rows("codenativex_calendly_bookings"),
    ]);
    const rows = [...legacyRows, ...calendlyRows];
    const leadIds = [...new Set(rows.map((row) => str(row, "lead_id")).filter(Boolean))];
    const leadRows = leadIds.length
      ? await this.rows(TABLES.leads, (query) => query.in("id", leadIds))
      : [];
    const leadById = new Map(leadRows.map((row) => [str(row, "id"), row]));
    return rows
      .map((row) => {
        const lead = leadById.get(str(row, "lead_id"));
        return mapMeeting({
          ...row,
          company_name:
            str(row, "company_name") || (lead ? str(lead, "company_name") : "Unknown lead"),
          contact_name: str(row, "contact_name") || (lead ? str(lead, "contact_name") : ""),
          contact_email: str(row, "contact_email") || (lead ? str(lead, "email") : ""),
        });
      })
      .sort((a, b) => Date.parse(b.scheduledFor ?? b.createdAt) - Date.parse(a.scheduledFor ?? a.createdAt));
  }

  async listCallQueue(): Promise<CallQueueEntry[]> {
    const rows = await this.rows(TABLES.callQueue);
    return rows
      .filter((row) => {
        const status = normalizeOutreachStatus(
          str(row, "outreach_status"),
          str(row, "reply_intent"),
        );
        return status === "calling_queue" || str(row, "next_action").toLowerCase().includes("call");
      })
      .map(mapCallQueue)
      .sort((a, b) => Date.parse(b.queuedAt) - Date.parse(a.queuedAt));
  }

  async listActivity(limit = 100): Promise<ActivityEvent[]> {
    const rows = await this.rows(TABLES.activity, (query) =>
      query.order("created_at", { ascending: false }).limit(limit),
    );
    return rows.map(mapActivity);
  }

  async getSettings(): Promise<WorkspaceSettings> {
    const { data, error } = await this.client.from(TABLES.settings).select("*").limit(1).maybeSingle();
    if (error) throw new Error(`Supabase query on "${TABLES.settings}" failed: ${error.message}`);
    if (!data) return DEFAULT_SETTINGS;
    const row = data as Row;
    return {
      autoApproveLeads: bool(row, "auto_approve_leads"),
      minimumApprovalScore: num(row, "minimum_approval_score", 70),
      requireEmailBeforeOutreach: bool(row, "require_email_before_outreach", true),
      requireOutreachCopyApproval: bool(row, "require_outreach_copy_approval", true),
      dailyOutreachLimit: num(row, "daily_outreach_limit", 100),
      followUpCount: num(row, "follow_up_count", 3),
      followUpIntervalDays: num(row, "follow_up_interval_days", 4),
      notifyOnNeedsReview: bool(row, "notify_on_needs_review", true),
      senderName: str(row, "sender_name"),
      senderEmail: str(row, "sender_email"),
    };
  }

  async updateSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    const { error } = await this.client.from(TABLES.settings).upsert(
      {
        id: "default",
        auto_approve_leads: settings.autoApproveLeads,
        minimum_approval_score: settings.minimumApprovalScore,
        require_email_before_outreach: settings.requireEmailBeforeOutreach,
        require_outreach_copy_approval: settings.requireOutreachCopyApproval,
        daily_outreach_limit: settings.dailyOutreachLimit,
        follow_up_count: settings.followUpCount,
        follow_up_interval_days: settings.followUpIntervalDays,
        notify_on_needs_review: settings.notifyOnNeedsReview,
        sender_name: settings.senderName,
        sender_email: settings.senderEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(`Could not save settings: ${error.message}`);
    return settings;
  }
}
