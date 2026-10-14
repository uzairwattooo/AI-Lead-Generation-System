import type { Lead } from '@/types';
export function conceptBlockedReason(lead: Pick<Lead, 'website' | 'pipelineLeadId' | 'approvalStatus' | 'rawOutreachStatus' | 'outreachStatus'>, active = false): string | null {
  if (active) return 'Homepage capture and redesign are already running.';
  if (!lead.website?.trim()) return 'Add a business website URL to capture its homepage.';
  if (lead.approvalStatus !== 'approved') return 'Approve this lead before creating a homepage concept.';
  if (!lead.pipelineLeadId) return 'Prepare this approved lead for outreach before creating a homepage concept.';
  if (lead.rawOutreachStatus === 'sending' || ['initial_email_sent', 'awaiting_reply', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'replied'].includes(lead.outreachStatus)) return 'Homepage concepts cannot change during or after outreach sending.';
  return null;
}
