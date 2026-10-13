"use client";
import { PageHeader } from "@/components/layout/page-header";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";
import { LeadReviewNav } from "@/components/leads/lead-review-nav";
const APPROVAL = ["approved"];
export function ReviewListClient() {
 return <><PageHeader title="Approved Leads" description="Reviewed businesses ready for outreach preparation. Review and approve each generated email before sending." /><LeadReviewNav />
 <LeadsWorkspace lockedApproval={APPROVAL} emptyTitle="No approved leads" emptyDescription="Leads appear here after your review decision." /></>;
}
