"use client";

import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";

export function LeadsPageClient() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId") ?? undefined;

  return (
    <>
      <PageHeader
        title="All Leads"
        description={
          requestId
            ? `Leads discovered by request ${requestId}.`
            : "Every business discovered by the Opportunity Hunter Agent, with verification and outreach state."
        }
      />
      <LeadsWorkspace
        requestId={requestId}
        emptyTitle="No leads yet"
        emptyDescription="Run a lead search to discover businesses that match your target market."
      />
    </>
  );
}
