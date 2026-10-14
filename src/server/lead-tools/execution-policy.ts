// Shared deadlines keep UI recovery aligned with the worker's actual limits.
export const CONTACT_SEARCH_TIMEOUT_MS = 60_000;
export const CONTACT_PROVIDER_TIMEOUT_MS = 40_000;
export const JOB_QUEUE_TIMEOUT_MS = 60_000;
export const CONCEPT_JOB_TIMEOUT_MS = 300_000;
export function staleJobReason(job: {kind: string; status: string; updated_at: string}, now = Date.now()): string | null {
  const elapsed = now - Date.parse(job.updated_at);
  if (job.status === 'queued' && elapsed > JOB_QUEUE_TIMEOUT_MS) return 'Search service did not start. No search result is available; check server logs.';
  const limit = job.kind === 'contacts' ? CONTACT_SEARCH_TIMEOUT_MS + 30_000 : CONCEPT_JOB_TIMEOUT_MS + 30_000;
  if (job.status === 'processing' && elapsed > limit) return 'The service stopped before completing this task. No completed result is available; check server logs.';
  return null;
}
