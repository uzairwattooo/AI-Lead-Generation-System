export const MAX_BULK_OPPORTUNITIES = 50;
export type BulkAction = "recheck_source" | "approve_verified";
export type BulkOpportunity = {
  id: string; company_name: string; kind: string; review_status: string;
  do_not_contact: boolean; source_verified: boolean; email: string | null;
  signals: readonly {label: string}[];
};
export type BulkResult = {id: string; name: string; status: "success" | "review" | "skipped" | "failed"; message: string};
export type BulkResponse = {verified?: boolean; emailFound?: boolean; message?: string};

export function bulkBlockReason(p: BulkOpportunity, action: BulkAction): string | null {
  if (p.kind !== "business") return "Public requests need individual review.";
  if (p.do_not_contact) return "Marked do not contact.";
  if (!["pending", "approved"].includes(p.review_status)) return "Rejected or inactive businesses cannot be processed in bulk.";
  if (action === "recheck_source") return p.source_verified && p.email ? "Source and contact are already verified." : null;
  if (p.review_status === "approved") return "Already approved.";
  if (!p.source_verified || !p.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return "Verify the official source and published email before bulk approval.";
  if (!p.signals?.length) return "No public evidence of a service opportunity; review individually.";
  return null;
}

/** One request at a time; a failed item does not discard the remaining results. */
export async function runOpportunityBatch(options: {
  rows: readonly BulkOpportunity[]; action: BulkAction;
  execute: (id: string, action: BulkAction) => Promise<BulkResponse>;
  shouldStop: () => boolean;
  onStart: (row: BulkOpportunity) => void;
  onResult: (result: BulkResult) => void;
}) {
  const unique = [...new Map(options.rows.map(p => [p.id, p])).values()];
  if (unique.length > MAX_BULK_OPPORTUNITIES) throw new Error(`Select up to ${MAX_BULK_OPPORTUNITIES} businesses at a time.`);
  const results: BulkResult[] = [];
  for (const p of unique) {
    if (options.shouldStop()) break;
    options.onStart(p);
    const reason = bulkBlockReason(p, options.action);
    let result: BulkResult;
    if (reason) result = {id:p.id,name:p.company_name,status:"skipped",message:reason};
    else {
      try {
        const response = await options.execute(p.id, options.action);
        const review = response.verified === false || response.emailFound === false;
        result = {id:p.id,name:p.company_name,status:review?"review":"success",message:response.message || (review?"Still needs source/contact review.":"Completed.")};
      } catch (error) {
        result = {id:p.id,name:p.company_name,status:"failed",message:error instanceof Error ? error.message : "Request failed. Refresh to check the current state before retrying."};
      }
    }
    results.push(result);
    options.onResult(result);
  }
  return results;
}
