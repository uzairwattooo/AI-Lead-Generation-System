/**
 * Core domain models for the CodeNativeX Lead Generation System.
 *
 * These types are the contract between the UI, the Next.js API routes and the
 * downstream Supabase / n8n backend. Keep them in sync with the database schema.
 */

/* -------------------------------------------------------------------------- */
/* Enumerations                                                               */
/* -------------------------------------------------------------------------- */

export const LEAD_REQUEST_STATUSES = [
  "queued",
  "running",
  "searching",
  "enriching",
  "validating",
  "deduplicating",
  "scoring",
  "completed",
  "needs_review",
  "failed",
  "cancelled",
] as const;
export type LeadRequestStatus = (typeof LEAD_REQUEST_STATUSES)[number];

export const PROGRESS_STAGES = [
  "request_queued",
  "lead_discovery",
  "website_verification",
  "lead_intake_cleaning",
  "lead_research_scoring",
  "personalized_outreach",
  "reply_monitoring",
  "meeting_booking",
  "finished",
] as const;
export type ProgressStageKey = (typeof PROGRESS_STAGES)[number];

export type StageStatus = "pending" | "active" | "completed" | "failed" | "skipped";

export const VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "invalid",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const OUTREACH_STATUSES = [
  "not_queued",
  "email_draft_ready",
  "awaiting_approval",
  "queued",
  "awaiting_reply",
  "outreach_failed",
  "outreach_blocked",
  "initial_email_sent",
  "follow_up_1",
  "follow_up_2",
  "follow_up_3",
  "replied",
  "interested",
  "not_interested",
  "do_not_contact",
  "calling_queue",
  "meeting_booked",
  "needs_human_review",
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const REPLY_CLASSIFICATIONS = [
  "interested",
  "pricing_question",
  "meeting_request",
  "not_interested",
  "do_not_contact",
  "unclear",
] as const;
export type ReplyClassification = (typeof REPLY_CLASSIFICATIONS)[number];

export const MEETING_STATUSES = [
  "requested",
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export type LeadPotential = "high" | "medium" | "low";

export const AUDIT_STATUSES = [
  "not_started",
  "audit_pending",
  "audit_processing",
  "audit_completed",
  "audit_failed",
  "audit_needs_review",
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export type AuditPriority = "critical" | "high" | "medium" | "low";

export interface AuditFinding {
  code: string;
  title: string;
  priority: AuditPriority;
  evidence: string;
  impact: string;
  recommendation: string;
}

export interface AuditScores {
  performanceMobile: number | null;
  performanceDesktop: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
}

export interface WebsiteAudit {
  id: string;
  leadId: string;
  status: AuditStatus;
  auditedUrl: string | null;
  finalUrl: string | null;
  httpStatus: number | null;
  hasHttps: boolean | null;
  score: number | null;
  confidence: number | null;
  scores: AuditScores;
  findings: AuditFinding[];
  evidence: Record<string, unknown>;
  screenshotUrl: string | null;
  reportFilename: string | null;
  reportAvailable: boolean;
  generatedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

/* -------------------------------------------------------------------------- */
/* Lead search request                                                        */
/* -------------------------------------------------------------------------- */

/** The payload the user composes on the Generate Leads page. */
export interface LeadSearchCriteria {
  source?: string;
  country: string;
  region: string;
  city: string;
  radiusKm: number;
  categories: string[];
  service: string;
  leadType: string;
  requestedLeadCount: number;
  minimumScore: number;
  requireEmail: boolean;
  requirePhone: boolean;
  requireDecisionMaker: boolean;
  excludedDomains: string[];
  additionalInstructions: string;
}

export interface LeadSearchRequest extends LeadSearchCriteria {
  id: string;
  status: LeadRequestStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  leadsFound: number;
  verifiedLeads: number;
  highPotentialLeads: number;
  errorMessage: string | null;
}

export interface ProgressStage {
  key: ProgressStageKey;
  label: string;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  detail: string | null;
}

export interface LeadSearchProgress {
  requestId: string;
  status: LeadRequestStatus;
  percentComplete: number;
  currentStage: ProgressStageKey;
  stages: ProgressStage[];
  sourcesChecked: number;
  businessesDiscovered: number;
  duplicatesRemoved: number;
  invalidContactsRejected: number;
  verifiedLeads: number;
  highPotentialLeads: number;
  startedAt: string | null;
  updatedAt: string;
  elapsedSeconds: number;
  errorMessage: string | null;
  timeline: ActivityEvent[];
}

/* -------------------------------------------------------------------------- */
/* Lead                                                                       */
/* -------------------------------------------------------------------------- */

export interface LeadScoreComponent {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  rationale: string | null;
}

export interface LeadScoreBreakdown {
  total: number;
  potential: LeadPotential;
  components: LeadScoreComponent[];
  calculatedAt: string;
}

export interface DecisionMaker {
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  profileUrl: string | null;
}

export interface DataSourceLink {
  label: string;
  url: string;
  retrievedAt: string | null;
}

export interface VerificationEvent {
  id: string;
  field: "email" | "phone" | "website" | "decision_maker";
  result: "valid" | "invalid" | "unknown";
  provider: string | null;
  checkedAt: string;
  detail: string | null;
}

export interface LeadNote {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  requestId: string;
  companyName: string;
  category: string;
  country: string;
  region: string | null;
  city: string | null;
  website: string | null;
  websiteScreenshotUrl: string | null;
  audit: WebsiteAudit | null;
  auditStatus: AuditStatus;
  auditScore: number | null;
  auditConfidence: number | null;
  auditBlockReason: string | null;
  emailPreviewStatus: string | null;
  outreachApprovedAt: string | null;
  email: string | null;
  phone: string | null;
  decisionMaker: DecisionMaker | null;
  opportunitySignals: string[];
  websiteIssues: string[];
  recommendedService: string;
  score: number;
  scoreBreakdown: LeadScoreBreakdown | null;
  verificationStatus: VerificationStatus;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  outreachStatus: OutreachStatus;
  isPossibleDuplicate: boolean;
  duplicateOfLeadId: string | null;
  sourceLinks: DataSourceLink[];
  verificationHistory: VerificationEvent[];
  notes: LeadNote[];
  discoveredAt: string;
}

/* -------------------------------------------------------------------------- */
/* Outreach, replies, meetings                                                */
/* -------------------------------------------------------------------------- */

export interface OutreachMessage {
  id: string;
  step: "initial" | "follow_up_1" | "follow_up_2" | "follow_up_3";
  subject: string;
  body: string;
  htmlBody?: string | null;
  status: "draft" | "awaiting_approval" | "sent" | "failed";
  sentAt: string | null;
}

export interface OutreachRecord {
  id: string;
  leadId: string;
  companyName: string;
  email: string | null;
  status: OutreachStatus;
  messages: OutreachMessage[];
  lastContactedAt: string | null;
  nextActionAt: string | null;
  requiresApproval: boolean;
  auditStatus: AuditStatus;
  auditScore: number | null;
  auditReportAvailable: boolean;
  auditReportFilename: string | null;
  auditBlockReason: string | null;
  gmailMessageId: string | null;
  gmailThreadId: string | null;
  updatedAt: string;
}

export interface ReplyRecord {
  id: string;
  leadId: string;
  outreachId: string;
  companyName: string;
  fromEmail: string;
  subject: string;
  body: string;
  classification: ReplyClassification;
  confidence: number;
  requiresHumanReview: boolean;
  handled: boolean;
  receivedAt: string;
}

export interface MeetingRecord {
  id: string;
  leadId: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  status: MeetingStatus;
  scheduledFor: string | null;
  durationMinutes: number;
  meetingUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CallQueueEntry {
  id: string;
  leadId: string;
  companyName: string;
  phone: string | null;
  reason: string;
  priority: "high" | "normal" | "low";
  queuedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Activity + metrics                                                         */
/* -------------------------------------------------------------------------- */

export type ActivitySeverity = "info" | "success" | "warning" | "error";

export interface ActivityEvent {
  id: string;
  requestId: string | null;
  leadId: string | null;
  actor: "opportunity_hunter" | "outreach_agent" | "system" | "user";
  action: string;
  message: string;
  severity: ActivitySeverity;
  createdAt: string;
}

export interface DashboardMetrics {
  totalLeadsFound: number;
  verifiedLeads: number;
  highPotentialLeads: number;
  pendingApproval: number;
  emailsSent: number;
  repliesReceived: number;
  meetingsBooked: number;
}

export interface PipelineStageSummary {
  stage: string;
  count: number;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  recentRequests: LeadSearchRequest[];
  pipeline: PipelineStageSummary[];
  recentActivity: ActivityEvent[];
  outreachSummary: PipelineStageSummary[];
  itemsNeedingReview: ActivityEvent[];
}

/* -------------------------------------------------------------------------- */
/* Settings + shared API shapes                                               */
/* -------------------------------------------------------------------------- */

export interface WorkspaceSettings {
  autoApproveLeads: boolean;
  minimumApprovalScore: number;
  requireEmailBeforeOutreach: boolean;
  requireOutreachCopyApproval: boolean;
  dailyOutreachLimit: number;
  followUpCount: number;
  followUpIntervalDays: number;
  notifyOnNeedsReview: boolean;
  senderName: string;
  senderEmail: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AgentConnectionStatus {
  opportunityHunter: "online" | "degraded" | "offline";
  outreachAgent: "online" | "degraded" | "offline";
  checkedAt: string;
  mode: "live" | "demo";
}
