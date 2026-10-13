"use client";
import { PageHeader } from "@/components/layout/page-header";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";
import { LeadReviewNav } from "@/components/leads/lead-review-nav";
const APPROVAL = ["rejected"];
export function ReviewListClient() {
 return <><PageHeader title="Rejected Leads" description="Businesses you chose not to contact. Their review history stays available; approve again if your decision changes." /><LeadReviewNav />
 <LeadsWorkspace lockedApproval={APPROVAL} emptyTitle="No rejected leads" emptyDescription="Leads appear here after your review decision." /></>;
}
