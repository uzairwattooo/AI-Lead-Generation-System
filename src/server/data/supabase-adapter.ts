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
} from "@/types";
import { PROGRESS_STAGE_LABELS } from "@/lib/constants";
import { applyRequestLeadKeysFilter } from "./lead-pipeline-query";
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

  return {
    id: str(row, "id"),
    requestId: str(row, "job_id"),
    companyName: str(row, "company_name"),
    category: str(row, "industry") || "Uncategorized",
    country: str(row, "country"),
    region: nullableStr(row, "region") ?? nullableStr(row, "state"),
    city: nullableStr(row, "city"),
    website: nullableStr(row, "website"),
    websiteScreenshotUrl: nullableStr(row, "website_screenshot_url"),
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

function normalizeOutreachStatus(value: string, replyIntent = ""): Lead["outreachStatus"] {
  const status = value.toLowerCase();
  const intent = replyIntent.toLowerCase();
  if (status.includes("do_not_contact") || intent === "do_not_contact") return "do_not_contact";
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
    meetingUrl: nullableStr(row, "meeting_link") ?? nullableStr(row, "calendar_event_url"),
    notes: nullableStr(row, "error_message") ?? nullableStr(row, "sales_handoff_status"),
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
        input_payload: { mode: "dashboard", criteria },
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
    let requestLeadKeys: string[] | null = null;

    if (query.requestId) {
      const candidateRows = await this.rows(TABLES.candidates, (candidateQuery) =>
        candidateQuery.select("lead_key").eq("job_id", query.requestId),
      );
      requestLeadKeys = [
        ...new Set(candidateRows.map((row) => str(row, "lead_key")).filter(Boolean)),
      ];

      if (requestLeadKeys.length === 0) {
        return {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
          facets: { categories: [], locations: [] },
        };
      }
    }

    let builder = this.client.from(TABLES.leads).select("*", { count: "exact" });

    builder = applyRequestLeadKeysFilter(builder, requestLeadKeys);
    if (query.categories?.length) builder = builder.in("industry", query.categories);
    if (query.verification?.length === 1 && query.verification[0] === "verified") {
      builder = builder.in("email_validation_status", ["deliverable", "verified"]);
    }
    if (query.verification?.length === 1 && query.verification[0] === "invalid") {
      builder = builder.in("email_validation_status", ["invalid", "undeliverable"]);
    }
    if (query.verification?.length === 1 && query.verification[0] === "pending") {
      builder = builder.in("email_enrichment_status", ["pending", "processing", "verification_pending"]);
    }
    if (query.outreach?.length) builder = builder.in("outreach_status", query.outreach);
    if (query.approval?.length) builder = builder.in("approval_status", query.approval);
    if (typeof query.minScore === "number") builder = builder.gte("qualification_score", query.minScore);
    if (typeof query.maxScore === "number") builder = builder.lte("qualification_score", query.maxScore);
    if (query.location) builder = builder.ilike("city", `%${query.location}%`);
    if (query.search) {
      const term = `%${query.search}%`;
      builder = builder.or(
        `company_name.ilike.${term},email.ilike.${term},website.ilike.${term},city.ilike.${term}`,
      );
    }

    const sortColumn =
      query.sortBy === "companyName"
        ? "company_name"
        : query.sortBy === "discoveredAt"
          ? "created_at"
          : query.sortBy === "category"
            ? "industry"
            : query.sortBy === "location"
              ? "city"
              : "qualification_score";

    const from = (query.page - 1) * query.pageSize;
    const { data, error, count } = await builder
      .order(sortColumn, { ascending: (query.sortDir ?? "desc") === "asc" })
      .range(from, from + query.pageSize - 1);

    if (error) throw new Error(`Supabase query on "${TABLES.leads}" failed: ${error.message}`);

    const facetRows = await this.rows(TABLES.leads, (q) => {
      const facetQuery = q.select("industry, city, country");
      return applyRequestLeadKeysFilter(facetQuery, requestLeadKeys);
    });

    return {
      items: (data as Row[]).map(mapLead),
      total: count ?? 0,
      page: query.page,
      pageSize: query.pageSize,
      facets: {
        categories: [...new Set(facetRows.map((row) => str(row, "industry")).filter(Boolean))].sort(),
        locations: [
          ...new Set(facetRows.map((row) => nullableStr(row, "city") ?? str(row, "country")).filter(Boolean)),
        ].sort(),
      },
    };
  }

  async getLead(id: string): Promise<Lead | null> {
    const { data, error } = await this.client.from(TABLES.leads).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase query on "${TABLES.leads}" failed: ${error.message}`);
    if (!data) return null;
    const lead = mapLead(data as Row);
    const notes = await this.rows(TABLES.notes, (query) =>
      query.eq("lead_id", id).order("created_at", { ascending: false }),
    );
    return {
      ...lead,
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
    const { data, error } = await this.client
      .from(TABLES.leads)
      .update({
        approval_status: approval,
        rejection_reason: approval === "rejected" ? (rejectionReason ?? null) : null,
        approved_by: this.userEmail,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids)
      .select("*");
    if (error) throw new Error(`Could not update lead approval: ${error.message}`);
    return (data as Row[]).map(mapLead);
  }

  async sendToOutreach(ids: string[]): Promise<OutreachRecord[]> {
    const { data, error } = await this.client
      .from(TABLES.leads)
      .update({
        outreach_status: "queued",
        status: "outreach_queued",
        next_action: "send_personalized_email",
        next_workflow: "03 - Personalized Email Outreach",
        updated_at: new Date().toISOString(),
      })
      .in("id", ids)
      .eq("approval_status", "approved")
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
    if (!record.messages.some((message) => message.id === messageId)) {
      throw new BackendNotConnectedError(`outreach/${outreachId}/messages/${messageId}`);
    }

    const { data, error } = await this.client
      .from(TABLES.outreach)
      .update({
        human_review_required: false,
        outreach_status: "queued",
        status: "outreach_queued",
        next_action: "send_personalized_email",
        next_workflow: "03 - Personalized Email Outreach",
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
    const rows = await this.rows(TABLES.meetings);
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
