"use client";

import Link from "next/link";
import { AlertTriangle, Settings } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-lead-data";

const PENDING_ONLY = ["pending"];

export function ApprovalsClient() {
  const { data: settings, isPending } = useSettings();

  return (
    <>
      <PageHeader
        title="Approval Queue"
        description="Leads waiting for a human decision. Nothing is contacted until it is approved here."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/settings">
              <Settings aria-hidden />
              Approval policy
            </Link>
          </Button>
        }
      />

      {isPending ? (
        <Skeleton className="mb-4 h-14 w-full" />
      ) : settings ? (
        <div
          className={
            settings.autoApproveLeads
              ? "mb-4 flex items-start gap-2 rounded-[var(--radius-card)] border border-amber-warn-100 bg-amber-warn-50 px-4 py-3 text-xs text-amber-warn-700 dark:border-amber-warn-700 dark:bg-amber-warn-700/20 dark:text-amber-warn-100"
              : "mb-4 flex items-start gap-2 rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3 text-xs text-[var(--app-text-muted)]"
          }
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            {settings.autoApproveLeads
              ? `Automatic approval is enabled. Leads scoring ${settings.minimumApprovalScore} or above enter outreach without a manual decision.`
              : `Automatic approval is off. Every lead needs a manual decision, and the minimum approval score is ${settings.minimumApprovalScore}.`}
          </p>
        </div>
      ) : null}

      <LeadsWorkspace
        lockedApproval={PENDING_ONLY}
        showWarnings
        minimumApprovalScore={settings?.minimumApprovalScore}
        emptyTitle="The approval queue is empty"
        emptyDescription="Every discovered lead has already been approved or rejected."
      />
    </>
  );
}
