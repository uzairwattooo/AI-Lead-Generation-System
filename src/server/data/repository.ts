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
  ReplyRecord,
  WorkspaceSettings,
} from "@/types";

export interface LeadQuery {
  page: number;
  pageSize: number;
  search?: string;
  requestId?: string;
  categories?: string[];
  location?: string;
  verification?: string[];
  outreach?: string[];
  approval?: string[];
  contact?: string[];
  recommendedOnly?: boolean;
  minScore?: number;
  maxScore?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface LeadFacets {
  categories: string[];
  locations: string[];
}

/**
 * The single contract every backend adapter must satisfy. Swapping the demo
 * adapter for Supabase requires no changes above this layer.
 */
export interface LeadRepository {
  readonly mode: "live" | "demo";

  getOverview(): Promise<DashboardOverview>;

  listRequests(): Promise<LeadSearchRequest[]>;
  getRequest(id: string): Promise<LeadSearchRequest | null>;
  createRequest(criteria: LeadSearchCriteria, createdBy: string): Promise<LeadSearchRequest>;
  cancelRequest(id: string): Promise<LeadSearchRequest>;
  retryRequest(id: string): Promise<LeadSearchRequest>;
  getProgress(id: string): Promise<LeadSearchProgress | null>;

  listLeads(query: LeadQuery): Promise<Paginated<Lead> & { facets: LeadFacets }>;
  getLead(id: string): Promise<Lead | null>;
  setApproval(
    ids: string[],
    approval: "approved" | "rejected",
    rejectionReason?: string,
  ): Promise<Lead[]>;
  sendToOutreach(ids: string[], options?: import("@/types").OutreachPreparationOptions): Promise<OutreachRecord[]>;
  addNote(leadId: string, body: string, author: string): Promise<LeadNote>;

  listOutreach(): Promise<OutreachRecord[]>;
  approveOutreachMessage(outreachId: string, messageId: string): Promise<OutreachRecord>;

  listReplies(): Promise<ReplyRecord[]>;
  markReplyHandled(replyId: string, handled: boolean): Promise<ReplyRecord>;

  listMeetings(): Promise<MeetingRecord[]>;
  listCallQueue(): Promise<CallQueueEntry[]>;

  listActivity(limit?: number): Promise<ActivityEvent[]>;

  getSettings(): Promise<WorkspaceSettings>;
  updateSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings>;
}

/** Thrown when a live backend is configured but a capability is not wired up. */
export class BackendNotConnectedError extends Error {
  readonly endpoint: string;
  constructor(endpoint: string) {
    super(
      `The Supabase backend is not connected for "${endpoint}". Configure the table and query in src/server/data/supabase-adapter.ts, or set NEXT_PUBLIC_DEMO_MODE=true to preview with demo data.`,
    );
    this.name = "BackendNotConnectedError";
    this.endpoint = endpoint;
  }
}
