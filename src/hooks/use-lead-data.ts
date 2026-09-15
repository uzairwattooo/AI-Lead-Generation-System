"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { leadService, type LeadListFilters } from "@/services/lead-service";
import { ApiError } from "@/services/http";
import { TERMINAL_REQUEST_STATUSES } from "@/lib/constants";
import type { WorkspaceSettings } from "@/types";

export const queryKeys = {
  overview: ["overview"] as const,
  agentStatus: ["agent-status"] as const,
  requests: ["lead-requests"] as const,
  request: (id: string) => ["lead-requests", id] as const,
  progress: (id: string) => ["lead-requests", id, "progress"] as const,
  leads: (filters: LeadListFilters) => ["leads", filters] as const,
  lead: (id: string) => ["leads", id] as const,
  outreach: ["outreach"] as const,
  replies: ["replies"] as const,
  meetings: ["meetings"] as const,
  callQueue: ["call-queue"] as const,
  activity: (limit: number) => ["activity", limit] as const,
  settings: ["settings"] as const,
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: ({ signal }) => leadService.getOverview(signal),
  });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: queryKeys.agentStatus,
    queryFn: ({ signal }) => leadService.getAgentStatus(signal),
    refetchInterval: 60_000,
  });
}

export function useRequests() {
  return useQuery({
    queryKey: queryKeys.requests,
    queryFn: ({ signal }) => leadService.listRequests(signal),
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.request(id),
    queryFn: ({ signal }) => leadService.getRequest(id, signal),
    enabled: id.length > 0,
  });
}

/**
 * Controlled polling for live agent progress. Polling stops as soon as the
 * request reaches a terminal status, and can be replaced by a Supabase
 * Realtime subscription without changing the consuming component.
 */
export function useRequestProgress(id: string) {
  return useQuery({
    queryKey: queryKeys.progress(id),
    queryFn: ({ signal }) => leadService.getProgress(id, signal),
    enabled: id.length > 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_REQUEST_STATUSES.includes(status)) return false;
      return 4000;
    },
    // A run can finish while the tab is in the background; keep polling so the
    // page shows the true state the moment the user returns to it.
    refetchIntervalInBackground: true,
  });
}

export function useLeads(filters: LeadListFilters) {
  return useQuery({
    queryKey: queryKeys.leads(filters),
    queryFn: ({ signal }) => leadService.listLeads(filters, signal),
    placeholderData: (previous) => previous,
  });
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: queryKeys.lead(id ?? ""),
    queryFn: ({ signal }) => leadService.getLead(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useOutreach() {
  return useQuery({ queryKey: queryKeys.outreach, queryFn: ({ signal }) => leadService.listOutreach(signal) });
}

export function useReplies() {
  return useQuery({ queryKey: queryKeys.replies, queryFn: ({ signal }) => leadService.listReplies(signal) });
}

export function useMeetings() {
  return useQuery({ queryKey: queryKeys.meetings, queryFn: ({ signal }) => leadService.listMeetings(signal) });
}

export function useCallQueue() {
  return useQuery({ queryKey: queryKeys.callQueue, queryFn: ({ signal }) => leadService.listCallQueue(signal) });
}

export function useActivity(limit = 100) {
  return useQuery({
    queryKey: queryKeys.activity(limit),
    queryFn: ({ signal }) => leadService.listActivity(limit, signal),
  });
}

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: ({ signal }) => leadService.getSettings(signal) });
}

function useLeadInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    void queryClient.invalidateQueries({ queryKey: queryKeys.outreach });
  };
}

export function useApproveLeads() {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: (leadIds: string[]) => leadService.approveLeads(leadIds),
    onSuccess: (result) => {
      toast.success(`${result.updated} lead${result.updated === 1 ? "" : "s"} approved`);
      invalidate();
    },
    onError: (error) => toast.error("Approval failed", { description: errorMessage(error) }),
  });
}

export function useRejectLeads() {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: (input: { leadIds: string[]; reason: string; note?: string }) =>
      leadService.rejectLeads(input.leadIds, input.reason, input.note),
    onSuccess: (result) => {
      toast.success(`${result.updated} lead${result.updated === 1 ? "" : "s"} rejected`);
      invalidate();
    },
    onError: (error) => toast.error("Rejection failed", { description: errorMessage(error) }),
  });
}

export function useSendToOutreach() {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: (leadIds: string[]) => leadService.sendToOutreach(leadIds),
    onSuccess: (result) => {
      toast.success(`${result.queued} lead${result.queued === 1 ? "" : "s"} queued for audit`, {
        description: result.detail,
      });
      invalidate();
    },
    onError: (error) => toast.error("Could not send to outreach", { description: errorMessage(error) }),
  });
}

export function useRegenerateAudit(leadId: string) {
  const invalidate = useLeadInvalidation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leadService.regenerateAudit(leadId),
    onSuccess: (result) => {
      toast.success("Fresh website audit queued", { description: result.dispatch.detail });
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
    },
    onError: (error) => toast.error("Could not regenerate audit", { description: errorMessage(error) }),
  });
}

export function useRegenerateEmail(leadId: string) {
  const invalidate = useLeadInvalidation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leadService.regenerateEmail(leadId),
    onSuccess: (result) => {
      toast.success("Email draft regeneration queued", { description: result.dispatch.detail });
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
    },
    onError: (error) => toast.error("Could not regenerate email", { description: errorMessage(error) }),
  });
}

export function useAddNote(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => leadService.addNote(leadId, body),
    onSuccess: () => {
      toast.success("Note saved");
      void queryClient.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error) => toast.error("Could not save the note", { description: errorMessage(error) }),
  });
}

export function useApproveOutreachMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { outreachId: string; messageId: string }) =>
      leadService.approveOutreachMessage(input.outreachId, input.messageId),
    onSuccess: () => {
      toast.success("Email approved and queued for sending");
      void queryClient.invalidateQueries({ queryKey: queryKeys.outreach });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
    onError: (error) => toast.error("Could not approve the email", { description: errorMessage(error) }),
  });
}

export function useMarkReplyHandled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { replyId: string; handled: boolean }) =>
      leadService.markReplyHandled(input.replyId, input.handled),
    onSuccess: (reply) => {
      toast.success(reply.handled ? "Reply marked as handled" : "Reply reopened");
      void queryClient.invalidateQueries({ queryKey: queryKeys.replies });
    },
    onError: (error) => toast.error("Could not update the reply", { description: errorMessage(error) }),
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadService.cancelRequest(id),
    onSuccess: (request) => {
      toast.success("Lead search cancelled");
      void queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress(request.id) });
    },
    onError: (error) => toast.error("Could not cancel the request", { description: errorMessage(error) }),
  });
}

export function useRetryRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadService.retryRequest(id),
    onSuccess: (request) => {
      toast.success("Lead search restarted");
      void queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress(request.id) });
    },
    onError: (error) => toast.error("Could not retry the request", { description: errorMessage(error) }),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: WorkspaceSettings) => leadService.updateSettings(settings),
    onSuccess: () => {
      toast.success("Settings saved");
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
    onError: (error) => toast.error("Could not save settings", { description: errorMessage(error) }),
  });
}

export { errorMessage };
