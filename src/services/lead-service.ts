/**
 * Centralized service layer. Components call these functions only - swapping
 * or extending backend endpoints happens here and nowhere else.
 */
import type {
  ActivityEvent,
  AgentConnectionStatus,
  CallQueueEntry,
  DashboardOverview,
  Lead,
  LeadNote,
  LeadSearchCriteria,
  LeadSearchProgress,
  LeadSearchRequest,
  MeetingRecord,
  OutreachRecord,
  OutreachPreparationOptions,
  Paginated,
  ReplyRecord,
  WorkspaceSettings,
} from "@/types";
import { apiGet, apiSend, toQueryString } from "./http";

export interface LeadListFilters {
  page: number;
  pageSize: number;
  search: string;
  requestId?: string;
  categories: string[];
  location: string;
  verification: string[];
  outreach: string[];
  approval: string[];
  contact: string[];
  recommendedOnly: boolean;
  minScore?: number;
  maxScore?: number;
  sortBy: string;
  sortDir: "asc" | "desc";
}

export type LeadListResult = Paginated<Lead> & {
  facets: { categories: string[]; locations: string[] };
};

export const leadService = {
  getOverview: (signal?: AbortSignal) => apiGet<DashboardOverview>("/api/overview", signal),

  getAgentStatus: (signal?: AbortSignal) => apiGet<AgentConnectionStatus>("/api/agent-status", signal),

  listRequests: (signal?: AbortSignal) => apiGet<LeadSearchRequest[]>("/api/lead-requests", signal),

  getRequest: (id: string, signal?: AbortSignal) =>
    apiGet<LeadSearchRequest>(`/api/lead-requests/${id}`, signal),

  getProgress: (id: string, signal?: AbortSignal) =>
    apiGet<LeadSearchProgress>(`/api/lead-requests/${id}/progress`, signal),

  createRequest: (criteria: LeadSearchCriteria) =>
    apiSend<{ request: LeadSearchRequest; dispatched: boolean; detail: string }>(
      "/api/lead-requests",
      "POST",
      criteria,
    ),

  cancelRequest: (id: string) =>
    apiSend<LeadSearchRequest>(`/api/lead-requests/${id}/cancel`, "POST"),

  retryRequest: (id: string) => apiSend<LeadSearchRequest>(`/api/lead-requests/${id}/retry`, "POST"),

  listLeads: (filters: LeadListFilters, signal?: AbortSignal) =>
    apiGet<LeadListResult>(
      `/api/leads${toQueryString({
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search,
        requestId: filters.requestId,
        categories: filters.categories,
        location: filters.location,
        verification: filters.verification,
        outreach: filters.outreach,
        approval: filters.approval,
        contact: filters.contact,
        recommendedOnly: filters.recommendedOnly ? "true" : undefined,
        minScore: filters.minScore,
        maxScore: filters.maxScore,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      })}`,
      signal,
    ),

  getLead: (id: string, signal?: AbortSignal) => apiGet<Lead>(`/api/leads/${id}`, signal),

  approveLeads: (leadIds: string[]) =>
    apiSend<{ updated: number; leads: Lead[] }>("/api/leads/approve", "POST", { leadIds }),

  rejectLeads: (leadIds: string[], reason: string, note?: string) =>
    apiSend<{ updated: number; leads: Lead[] }>("/api/leads/reject", "POST", { leadIds, reason, note }),

  sendToOutreach: (leadIds: string[], options: OutreachPreparationOptions) =>
    apiSend<{ queued: number; records: OutreachRecord[]; detail: string }>(
      "/api/leads/send-to-outreach",
      "POST",
      { leadIds, options },
    ),

  regenerateAudit: (leadId: string) =>
    apiSend<{ queued: boolean; dispatch: { dispatched: boolean; detail: string } }>(
      `/api/leads/${leadId}/audit/regenerate`,
      "POST",
    ),

  regenerateEmail: (leadId: string) =>
    apiSend<{ queued: boolean; dispatch: { dispatched: boolean; detail: string } }>(
      `/api/leads/${leadId}/email/regenerate`,
      "POST",
    ),

  addNote: (leadId: string, body: string) =>
    apiSend<LeadNote>(`/api/leads/${leadId}/notes`, "POST", { body }),

  listOutreach: (signal?: AbortSignal) => apiGet<OutreachRecord[]>("/api/outreach", signal),

  approveOutreachMessage: (outreachId: string, messageId: string) =>
    apiSend<OutreachRecord>(`/api/outreach/${outreachId}/approve-message`, "POST", { messageId }),

  listReplies: (signal?: AbortSignal) => apiGet<ReplyRecord[]>("/api/replies", signal),

  markReplyHandled: (replyId: string, handled: boolean) =>
    apiSend<ReplyRecord>(`/api/replies/${replyId}/handled`, "POST", { handled }),

  listMeetings: (signal?: AbortSignal) => apiGet<MeetingRecord[]>("/api/meetings", signal),

  listCallQueue: (signal?: AbortSignal) => apiGet<CallQueueEntry[]>("/api/call-queue", signal),

  listActivity: (limit = 100, signal?: AbortSignal) =>
    apiGet<ActivityEvent[]>(`/api/activity${toQueryString({ limit })}`, signal),

  getSettings: (signal?: AbortSignal) => apiGet<WorkspaceSettings>("/api/settings", signal),

  updateSettings: (settings: WorkspaceSettings) =>
    apiSend<WorkspaceSettings>("/api/settings", "PUT", settings),
};
