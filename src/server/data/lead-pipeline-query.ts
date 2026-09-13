/**
 * Restricts lead_pipeline to the lead keys discovered for one dashboard
 * request. The request id is resolved from lead_discovery_candidates and is
 * never compared with lead_discovery_jobs.job_id.
 */
export function applyRequestLeadKeysFilter<T extends { in(column: string, values: string[]): T }>(
  query: T,
  leadKeys: string[] | null,
): T {
  return leadKeys ? query.in("lead_key", leadKeys) : query;
}
