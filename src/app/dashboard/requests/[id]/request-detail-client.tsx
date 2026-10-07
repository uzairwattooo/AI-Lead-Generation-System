"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Circle,
  Loader2,
  RotateCcw,
  Users,
  XCircle,
} from "lucide-react";

import { ActivityList } from "@/components/activity-list";
import { PageHeader } from "@/components/layout/page-header";
import { RequestStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import {
  useCancelRequest,
  useRequest,
  useRequestProgress,
  useRetryRequest,
} from "@/hooks/use-lead-data";
import { TERMINAL_REQUEST_STATUSES } from "@/lib/constants";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { initialSmoothProgress, nextSmoothProgress } from "@/lib/smooth-progress";
import type { ProgressStage } from "@/types";

function StageIcon({ status }: { status: ProgressStage["status"] }) {
  if (status === "completed") return <CheckCircle2 className="size-4 text-teal-600" aria-hidden />;
  if (status === "active") return <Loader2 className="size-4 animate-spin text-[var(--app-primary)]" aria-hidden />;
  if (status === "failed") return <XCircle className="size-4 text-danger-600" aria-hidden />;
  return <Circle className="size-4 text-[var(--app-text-subtle)]" aria-hidden />;
}

const STAGE_STATUS_TEXT: Record<ProgressStage["status"], string> = {
  pending: "Pending",
  active: "In progress",
  completed: "Completed",
  failed: "Failed",
  skipped: "Not reached",
};

export function RequestDetailClient({ requestId }: { requestId: string }) {
  const requestQuery = useRequest(requestId);
  const progressQuery = useRequestProgress(requestId);
  const cancelMutation = useCancelRequest();
  const retryMutation = useRetryRequest();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [displayedPercent, setDisplayedPercent] = React.useState(0);

  const request = requestQuery.data;
  const progress = progressQuery.data;

  React.useEffect(() => {
    if (!progress) return;

    const terminal = TERMINAL_REQUEST_STATUSES.includes(progress.status);
    const effectStartedAt = performance.now();
    const updateDisplayedProgress = () => {
      const elapsedSinceUpdate = Math.floor((performance.now() - effectStartedAt) / 1000);
      setDisplayedPercent((current) =>
        current === 0
          ? initialSmoothProgress(progress.percentComplete, progress.elapsedSeconds, terminal)
          : nextSmoothProgress({
              displayed: current,
              reported: progress.percentComplete,
              elapsedSeconds: progress.elapsedSeconds + elapsedSinceUpdate,
              terminal,
            }),
      );
    };

    const initialTimer = window.setTimeout(updateDisplayedProgress, 0);
    if (terminal) return () => window.clearTimeout(initialTimer);
    const timer = window.setInterval(() => {
      updateDisplayedProgress();
    }, 1200);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [progress]);

  if (requestQuery.isError || progressQuery.isError) {
    const error = requestQuery.error ?? progressQuery.error;
    return (
      <>
        <PageHeader title="Request details" />
        <Card>
          <ErrorState
            title="This request could not be loaded"
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => {
              void requestQuery.refetch();
              void progressQuery.refetch();
            }}
          />
        </Card>
      </>
    );
  }

  if (requestQuery.isPending || progressQuery.isPending || !request || !progress) {
    return (
      <>
        <PageHeader title="Request details" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </>
    );
  }

  const isTerminal = TERMINAL_REQUEST_STATUSES.includes(progress.status);
  const progressTone =
    progress.status === "failed"
      ? "danger"
      : progress.status === "needs_review"
        ? "warning"
        : progress.status === "completed"
          ? "success"
          : "primary";
  const isLinkedIn = request.source === "linkedin_public_search";

  const leadTypeLabel = isLinkedIn
    ? "Businesses seeking website services"
    : request.leadType;
  const stats = [
    { label: "Sources checked", value: progress.sourcesChecked },
    { label: "Businesses discovered", value: progress.businessesDiscovered },
    { label: "Recommended", value: Math.min(2, progress.verifiedLeads) },
    { label: "Available to review", value: progress.verifiedLeads },
  ];
  const visibleStages = progress.stages
    .filter((stage) => ["request_queued", "lead_discovery", "finished"].includes(stage.key))
    .map((stage) =>
      stage.key === "finished"
        ? { ...stage, label: "Human review ready", detail: "All discovered businesses remain visible." }
        : stage,
    );

  return (
    <>
      <PageHeader
        title={`${request.categories.join(", ")} in ${request.city || request.region || request.country}`}
        description={`${request.service} · ${leadTypeLabel}${isLinkedIn ? "" : ` · ${request.radiusKm} km radius`} · Request ${request.id}`}
        actions={
          <>
            {progress.businessesDiscovered > 0 || isTerminal ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/dashboard/leads?requestId=${request.id}`}>
                  <Users aria-hidden />
                  View leads
                </Link>
              </Button>
            ) : null}
            {!isTerminal ? (
              <Button variant="secondary" size="sm" onClick={() => setCancelOpen(true)}>
                <Ban aria-hidden />
                Cancel run
              </Button>
            ) : null}
            {progress.status === "failed" || progress.status === "cancelled" ? (
              <Button
                size="sm"
                loading={retryMutation.isPending}
                onClick={() => retryMutation.mutate(request.id)}
              >
                <RotateCcw aria-hidden />
                Retry request
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-4">
        {progress.errorMessage ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[var(--radius-card)] border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-700 dark:bg-danger-700/20 dark:text-danger-100"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">The lead search failed</p>
              <p className="mt-0.5 text-xs">{progress.errorMessage}</p>
            </div>
          </div>
        ) : null}

        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RequestStatusBadge status={progress.status} />
                <span className="text-sm text-[var(--app-text-muted)]">
                  {progress.stages.find((stage) => stage.key === progress.currentStage)?.label ??
                    "Waiting for the agent"}
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">{displayedPercent}%</span>
            </div>

            <Progress
              value={displayedPercent}
              tone={progressTone}
              aria-label="Overall progress"
            />

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--app-text-muted)]">
              <span>Started {formatDateTime(progress.startedAt)}</span>
              <span>Elapsed {formatDuration(progress.elapsedSeconds)}</span>
              <span>Updated {formatDateTime(progress.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <section
          aria-label="Run statistics"
          className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        >
          {stats.map((stat) => (
            <Card key={stat.label} className="p-3">
              <p className="text-[11px] text-[var(--app-text-muted)]">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(stat.value)}</p>
            </Card>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Agent stages</CardTitle>
            </CardHeader>
            <ol className="divide-y divide-[var(--app-border)]">
              {visibleStages.map((stage, index) => (
                <li key={stage.key} className="flex items-start gap-3 px-4 py-2.5 sm:px-5">
                  <span className="mt-0.5 shrink-0">
                    <StageIcon status={stage.status} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        stage.status === "pending" || stage.status === "skipped"
                          ? "text-sm text-[var(--app-text-subtle)]"
                          : "text-sm text-[var(--app-text)]"
                      }
                    >
                      <span className="tabular-nums text-[var(--app-text-subtle)]">{index + 1}. </span>
                      {stage.label}
                    </p>
                    {stage.detail ? (
                      <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">{stage.detail}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--app-text-subtle)]">
                    {STAGE_STATUS_TEXT[stage.status]}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live activity</CardTitle>
            </CardHeader>
            <ActivityList
              events={progress.timeline}
              emptyTitle="No activity recorded yet"
              emptyDescription="Events from this run will appear here as the agent works."
            />
          </Card>
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this lead search?</DialogTitle>
            <DialogDescription>
              The agent will stop after the current step. Leads already verified and saved are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep running
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate(request.id, { onSuccess: () => setCancelOpen(false) })
              }
            >
              Cancel run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
