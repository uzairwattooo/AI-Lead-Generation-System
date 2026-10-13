"use client";

import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { LeadReviewNav } from "@/components/leads/lead-review-nav";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";

const PENDING_ONLY = ["pending"];

export function LeadsPageClient() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId") ?? undefined;

  return (
    <>
      <PageHeader
        title="New Leads"
        description={
          requestId
            ? `Leads discovered by request ${requestId}.`
            : "Review new businesses here. Approved and rejected leads move to their own lists."
        }
      />
      <LeadReviewNav />
      <LeadsWorkspace
        lockedApproval={PENDING_ONLY}
        requestId={requestId}
        emptyTitle="No leads yet"
        emptyDescription="Run a lead search to discover businesses that match your target market."
      />
    </>
  );
}
