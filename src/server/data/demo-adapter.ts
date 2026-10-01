/**
 * Demo adapter for the LeadRepository contract.
 *
 * Backed by an in-memory store seeded from `demo-dataset.ts`. Mutations are
 * kept on `globalThis` so they survive hot reloads during development.
 */
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
  ProgressStageKey,
  ReplyRecord,
  WorkspaceSettings,
} from "@/types";
import { OUTREACH_STATUS_LABELS, PROGRESS_STAGE_LABELS } from "@/lib/constants";
import { leadPotential } from "@/lib/format";
import { buildDemoDataset, type DemoDataset } from "./demo-dataset";
import type { LeadFacets, LeadQuery, LeadRepository } from "./repository";

const STORE_KEY = "__codenativex_demo_store__";

type DemoStore = DemoDataset & { sequence: number };

function getStore(): DemoStore {
  const globalScope = globalThis as typeof globalThis & { [STORE_KEY]?: DemoStore };
  if (!globalScope[STORE_KEY]) {
    globalScope[STORE_KEY] = { ...buildDemoDataset(), sequence: 1000 };
  }
  return globalScope[STORE_KEY];
}

function nextId(prefix: string): string {
  const store = getStore();
  store.sequence += 1;
  return `${prefix}_${store.sequence.toString(36)}`;
}

/** Demo requests advance one stage roughly every 12 seconds after start. */
const STAGE_SECONDS = 12;

function stageIndexForStatus(status: LeadSearchRequest["status"]): number {
  switch (status) {
    case "queued":
      return 0;
    case "searching":
    case "running":
      return 1;
    case "enriching":
      return 2;
    case "validating":
      return 3;
    case "deduplicating":
      return 3;
    case "scoring":
      return 4;
    default:
      return PROGRESS_STAGES.length - 1;
  }
}

function isActiveStatus(status: LeadSearchRequest["status"]): boolean {
  return !["completed", "needs_review", "failed", "cancelled"].includes(status);
}

function buildStages(activeIndex: number, failed: boolean, request: LeadSearchRequest): ProgressStage[] {
  return PROGRESS_STAGES.map((key, index) => {
    let status: ProgressStage["status"] = "pending";
    if (index < activeIndex) status = "completed";
    else if (index === activeIndex) status = failed ? "failed" : "active";
    if (!isActiveStatus(request.status) && !failed) status = index <= activeIndex ? "completed" : "skipped";
    return {
      key,
      label: PROGRESS_STAGE_LABELS[key],
      status,
      startedAt: index <= activeIndex ? request.startedAt : null,
      completedAt: index < activeIndex ? request.startedAt : null,
      detail: null,
    };
  });
}

function progressFor(request: LeadSearchRequest, activity: ActivityEvent[]): LeadSearchProgress {
  const startedAt = request.startedAt ?? request.createdAt;
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
  const totalStages = PROGRESS_STAGES.length;

  const failed = request.status === "failed";
  let activeIndex: number;
  if (isActiveStatus(request.status)) {
    activeIndex = Math.min(totalStages - 2, Math.floor(elapsedSeconds / STAGE_SECONDS));
  } else {
    activeIndex = failed ? stageIndexForStatus("validating") : totalStages - 1;
  }

  const percentComplete = isActiveStatus(request.status)
    ? Math.min(96, Math.round(((activeIndex + 0.5) / totalStages) * 100))
    : failed || request.status === "cancelled"
      ? Math.round((activeIndex / totalStages) * 100)
      : 100;

  const scale = isActiveStatus(request.status) ? Math.min(1, (activeIndex + 1) / totalStages) : 1;
  const currentStage = PROGRESS_STAGES[activeIndex] ?? "finished";

  // A running request has no saved totals yet, so the in-flight counters are
  // projected from the requested lead count until real results are written.
  const expectedLeads = request.leadsFound || Math.round(request.requestedLeadCount * 0.62);
  const expectedVerified = request.verifiedLeads || Math.round(expectedLeads * 0.74);
  const expectedHigh = request.highPotentialLeads || Math.round(expectedVerified * 0.34);

  return {
    requestId: request.id,
    status: request.status,
    percentComplete,
    currentStage: currentStage as ProgressStageKey,
    stages: buildStages(activeIndex, failed, request),
    sourcesChecked: failed ? 1 : Math.max(1, Math.round(9 * scale)),
    businessesDiscovered: Math.round(expectedLeads * scale * 1.6),
    duplicatesRemoved: Math.round(expectedLeads * scale * 0.18),
    invalidContactsRejected: Math.round(expectedLeads * scale * 0.22),
    verifiedLeads: Math.round(expectedVerified * scale),
    highPotentialLeads: Math.round(expectedHigh * scale),
    startedAt: request.startedAt,
    updatedAt: new Date().toISOString(),
    elapsedSeconds: isActiveStatus(request.status)
      ? elapsedSeconds
      : Math.max(
          0,
          Math.floor(
            (Date.parse(request.completedAt ?? startedAt) - Date.parse(startedAt)) / 1000,
          ),
        ),
    errorMessage: request.errorMessage,
    timeline: activity
      .filter((event) => event.requestId === request.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  };
}

function matchesFilter(values: string[] | undefined, candidate: string): boolean {
  return !values || values.length === 0 || values.includes(candidate);
}

function compareLeads(a: Lead, b: Lead, sortBy: string, dir: "asc" | "desc"): number {
  const factor = dir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "companyName":
      return a.companyName.localeCompare(b.companyName) * factor;
    case "category":
      return a.category.localeCompare(b.category) * factor;
    case "location":
      return `${a.city ?? ""}${a.country}`.localeCompare(`${b.city ?? ""}${b.country}`) * factor;
    case "discoveredAt":
      return (Date.parse(a.discoveredAt) - Date.parse(b.discoveredAt)) * factor;
    case "score":
    default:
      return (a.score - b.score) * factor;
  }
}

export class DemoAdapter implements LeadRepository {
  readonly mode = "demo" as const;

  private logActivity(event: Omit<ActivityEvent, "id" | "createdAt">): void {
    const store = getStore();
    store.activity.unshift({
      ...event,
      id: nextId("act"),
      createdAt: new Date().toISOString(),
    });
  }

  async getOverview(): Promise<DashboardOverview> {
    const store = getStore();
    const leads = store.leads;

    const emailsSent = store.outreach.reduce(
      (total, record) => total + record.messages.filter((message) => message.status === "sent").length,
      0,
    );

    const pipeline: PipelineStageSummary[] = [
      { stage: "Discovered", count: leads.length },
      { stage: "Verified", count: leads.filter((lead) => lead.verificationStatus === "verified").length },
      { stage: "Pending approval", count: leads.filter((lead) => lead.approvalStatus === "pending").length },
      { stage: "Approved", count: leads.filter((lead) => lead.approvalStatus === "approved").length },
      { stage: "In outreach", count: store.outreach.length },
      { stage: "Replied", count: store.replies.length },
      { stage: "Meetings booked", count: store.meetings.length },
    ];

    const outreachSummary: PipelineStageSummary[] = Object.entries(
      store.outreach.reduce<Record<string, number>>((acc, record) => {
        acc[record.status] = (acc[record.status] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([status, count]) => ({
        stage: OUTREACH_STATUS_LABELS[status as keyof typeof OUTREACH_STATUS_LABELS] ?? status,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      metrics: {
        totalLeadsFound: leads.length,
        verifiedLeads: leads.filter((lead) => lead.verificationStatus === "verified").length,
        highPotentialLeads: leads.filter((lead) => leadPotential(lead.score) === "high").length,
        pendingApproval: leads.filter((lead) => lead.approvalStatus === "pending").length,
        emailsSent,
        repliesReceived: store.replies.length,
        meetingsBooked: store.meetings.filter((meeting) => meeting.status !== "cancelled").length,
      },
      recentRequests: [...store.requests]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 5),
      pipeline,
      recentActivity: store.activity.slice(0, 8),
      outreachSummary,
      itemsNeedingReview: store.activity
        .filter((event) => event.severity === "warning" || event.severity === "error")
        .slice(0, 5),
    };
  }

  async listRequests(): Promise<LeadSearchRequest[]> {
    return [...getStore().requests].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async getRequest(id: string): Promise<LeadSearchRequest | null> {
    return getStore().requests.find((request) => request.id === id) ?? null;
  }

  async createRequest(criteria: LeadSearchCriteria, createdBy: string): Promise<LeadSearchRequest> {
    const store = getStore();
    const now = new Date().toISOString();
    const request: LeadSearchRequest = {
      ...criteria,
      id: nextId("req"),
      status: "queued",
      createdAt: now,
      startedAt: now,
      completedAt: null,
      createdBy,
      leadsFound: 0,
      verifiedLeads: 0,
      highPotentialLeads: 0,
      errorMessage: null,
    };
    store.requests.unshift(request);
    this.logActivity({
      requestId: request.id,
      leadId: null,
      actor: "system",
      action: "request_queued",
      message: `Lead search queued for ${criteria.categories.join(", ")} in ${criteria.city || criteria.region || criteria.country}.`,
      severity: "info",
    });
    return request;
  }

  async cancelRequest(id: string): Promise<LeadSearchRequest> {
    const store = getStore();
    const request = store.requests.find((item) => item.id === id);
    if (!request) throw new Error(`Request ${id} was not found`);
    request.status = "cancelled";
    request.completedAt = new Date().toISOString();
    this.logActivity({
      requestId: id,
      leadId: null,
      actor: "user",
      action: "request_cancelled",
      message: "The lead search was cancelled by a user.",
      severity: "warning",
    });
    return request;
  }

  async retryRequest(id: string): Promise<LeadSearchRequest> {
    const store = getStore();
    const request = store.requests.find((item) => item.id === id);
    if (!request) throw new Error(`Request ${id} was not found`);
    request.status = "queued";
    request.errorMessage = null;
    request.startedAt = new Date().toISOString();
    request.completedAt = null;
    this.logActivity({
      requestId: id,
      leadId: null,
      actor: "user",
      action: "request_retried",
      message: "The lead search was retried.",
      severity: "info",
    });
    return request;
  }

  async getProgress(id: string): Promise<LeadSearchProgress | null> {
    const store = getStore();
    const request = store.requests.find((item) => item.id === id);
    if (!request) return null;

    // Advance demo requests through their statuses over time.
    if (isActiveStatus(request.status) && request.startedAt) {
      const elapsed = (Date.now() - Date.parse(request.startedAt)) / 1000;
      const index = Math.floor(elapsed / STAGE_SECONDS);
      const sequence: LeadSearchRequest["status"][] = [
        "queued",
        "searching",
        "enriching",
        "enriching",
        "enriching",
        "validating",
        "deduplicating",
        "scoring",
        "running",
      ];
      request.status = sequence[Math.min(index, sequence.length - 1)] ?? "running";
      if (index >= PROGRESS_STAGES.length - 1) {
        request.status = "completed";
        request.completedAt = new Date().toISOString();
        request.leadsFound = request.leadsFound || Math.round(request.requestedLeadCount * 0.62);
        request.verifiedLeads = request.verifiedLeads || Math.round(request.leadsFound * 0.74);
        request.highPotentialLeads =
          request.highPotentialLeads || Math.round(request.verifiedLeads * 0.34);
      }
    }

    return progressFor(request, store.activity);
  }

  async listLeads(query: LeadQuery): Promise<Paginated<Lead> & { facets: LeadFacets }> {
    const store = getStore();
    const search = query.search?.trim().toLowerCase();

    const filtered = store.leads.filter((lead) => {
      if (query.requestId && lead.requestId !== query.requestId) return false;
      if (!matchesFilter(query.categories, lead.category)) return false;
      if (!matchesFilter(query.verification, lead.verificationStatus)) return false;
      if (!matchesFilter(query.outreach, lead.outreachStatus)) return false;
      if (!matchesFilter(query.approval, lead.approvalStatus)) return false;
      if (query.location) {
        const location = `${lead.city ?? ""} ${lead.region ?? ""} ${lead.country}`.toLowerCase();
        if (!location.includes(query.location.toLowerCase())) return false;
      }
      if (typeof query.minScore === "number" && lead.score < query.minScore) return false;
      if (typeof query.maxScore === "number" && lead.score > query.maxScore) return false;
      if (search) {
        const haystack = [
          lead.companyName,
          lead.category,
          lead.email ?? "",
          lead.phone ?? "",
          lead.website ?? "",
          lead.city ?? "",
          lead.decisionMaker?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) =>
      compareLeads(a, b, query.sortBy ?? "score", query.sortDir ?? "desc"),
    );

    const start = (query.page - 1) * query.pageSize;

    return {
      items: sorted.slice(start, start + query.pageSize),
      total: sorted.length,
      page: query.page,
      pageSize: query.pageSize,
      facets: {
        categories: [...new Set(store.leads.map((lead) => lead.category))].sort(),
        locations: [...new Set(store.leads.map((lead) => lead.city ?? lead.country))].sort(),
      },
    };
  }

  async getLead(id: string): Promise<Lead | null> {
    return getStore().leads.find((lead) => lead.id === id) ?? null;
  }

  async setApproval(
    ids: string[],
    approval: "approved" | "rejected",
    rejectionReason?: string,
  ): Promise<Lead[]> {
    const store = getStore();
    const updated: Lead[] = [];
    for (const lead of store.leads) {
      if (!ids.includes(lead.id)) continue;
      lead.approvalStatus = approval;
      lead.rejectionReason = approval === "rejected" ? (rejectionReason ?? null) : null;
      updated.push(lead);
    }
    if (updated.length > 0) {
      this.logActivity({
        requestId: null,
        leadId: updated.length === 1 ? (updated[0]?.id ?? null) : null,
        actor: "user",
        action: approval === "approved" ? "leads_approved" : "leads_rejected",
        message: `${updated.length} lead${updated.length === 1 ? "" : "s"} ${approval}.`,
        severity: approval === "approved" ? "success" : "info",
      });
    }
    return updated;
  }

  async sendToOutreach(ids: string[]): Promise<OutreachRecord[]> {
    const store = getStore();
    const created: OutreachRecord[] = [];
    for (const id of ids) {
      const lead = store.leads.find((item) => item.id === id);
      if (!lead || lead.approvalStatus !== "approved") continue;
      if (store.outreach.some((record) => record.leadId === lead.id)) continue;
      const record: OutreachRecord = {
        id: nextId("out"),
        leadId: lead.id,
        companyName: lead.companyName,
        email: lead.email,
        status: "queued",
        requiresApproval: store.settings.requireOutreachCopyApproval,
        auditStatus: lead.auditStatus,
        auditScore: lead.auditScore,
        auditReportAvailable: Boolean(lead.audit?.reportAvailable),
        auditReportFilename: lead.audit?.reportFilename ?? null,
        auditBlockReason: lead.auditBlockReason,
        gmailMessageId: null,
        gmailThreadId: null,
        lastContactedAt: null,
        nextActionAt: null,
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: nextId("msg"),
            step: "initial",
            subject: `Improving the ${lead.category.toLowerCase()} website for ${lead.companyName}`,
            body:
              `Hello ${lead.decisionMaker?.name ?? "there"},\n\n` +
              `We reviewed ${lead.website ?? "your online presence"} and found ` +
              `${lead.websiteIssues[0]?.toLowerCase() ?? "a few opportunities to improve performance"}.\n\n` +
              `CodeNativeX can help with ${lead.recommendedService.toLowerCase()}. Would a short call make sense?`,
            status: store.settings.requireOutreachCopyApproval ? "awaiting_approval" : "draft",
            sentAt: null,
          },
        ],
      };
      lead.outreachStatus = "queued";
      store.outreach.unshift(record);
      created.push(record);
    }
    if (created.length > 0) {
      this.logActivity({
        requestId: null,
        leadId: null,
        actor: "system",
        action: "sent_to_outreach",
        message: `${created.length} approved lead${created.length === 1 ? "" : "s"} handed to the Outreach Agent.`,
        severity: "success",
      });
    }
    return created;
  }

  async addNote(leadId: string, body: string, author: string): Promise<LeadNote> {
    const store = getStore();
    const lead = store.leads.find((item) => item.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} was not found`);
    const note: LeadNote = {
      id: nextId("note"),
      author,
      body,
      createdAt: new Date().toISOString(),
    };
    lead.notes = [note, ...lead.notes];
    return note;
  }

  async listOutreach(): Promise<OutreachRecord[]> {
    return [...getStore().outreach].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async approveOutreachMessage(outreachId: string, messageId: string): Promise<OutreachRecord> {
    const store = getStore();
    const record = store.outreach.find((item) => item.id === outreachId);
    if (!record) throw new Error(`Outreach record ${outreachId} was not found`);
    const message = record.messages.find((item) => item.id === messageId);
    if (!message) throw new Error(`Message ${messageId} was not found`);
    message.status = "sent";
    message.sentAt = new Date().toISOString();
    record.status = "initial_email_sent";
    record.requiresApproval = false;
    record.lastContactedAt = message.sentAt;
    record.updatedAt = message.sentAt;
    const lead = store.leads.find((item) => item.id === record.leadId);
    if (lead) lead.outreachStatus = "initial_email_sent";
    this.logActivity({
      requestId: null,
      leadId: record.leadId,
      actor: "outreach_agent",
      action: "email_sent",
      message: `Approved email sent to ${record.companyName}.`,
      severity: "success",
    });
    return record;
  }

  async listReplies(): Promise<ReplyRecord[]> {
    return [...getStore().replies].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  }

  async markReplyHandled(replyId: string, handled: boolean): Promise<ReplyRecord> {
    const store = getStore();
    const reply = store.replies.find((item) => item.id === replyId);
    if (!reply) throw new Error(`Reply ${replyId} was not found`);
    reply.handled = handled;
    return reply;
  }

  async listMeetings(): Promise<MeetingRecord[]> {
    return [...getStore().meetings].sort(
      (a, b) => Date.parse(b.scheduledFor ?? b.createdAt) - Date.parse(a.scheduledFor ?? a.createdAt),
    );
  }

  async listCallQueue(): Promise<CallQueueEntry[]> {
    return [...getStore().callQueue];
  }

  async listActivity(limit = 100): Promise<ActivityEvent[]> {
    return getStore()
      .activity.slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit);
  }

  async getSettings(): Promise<WorkspaceSettings> {
    return { ...getStore().settings };
  }

  async updateSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    const store = getStore();
    store.settings = { ...settings };
    return { ...store.settings };
  }
}
