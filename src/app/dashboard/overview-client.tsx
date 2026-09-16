"use client";

import Link from "next/link";
import {
  CalendarCheck,
  CheckSquare,
  Mail,
  MessageSquare,
  Plus,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { ActivityList } from "@/components/activity-list";
import { MetricStrip, type Metric } from "@/components/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { RequestStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useOverview } from "@/hooks/use-lead-data";
import { formatDate, formatNumber } from "@/lib/format";

export function OverviewClient() {
  const { data, isPending, isError, error, refetch } = useOverview();

  if (isError) {
    return (
      <>
        <PageHeader title="Overview" description="Pipeline health across discovery, approval and outreach." />
        <Card>
          <ErrorState
            title="The overview could not be loaded"
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        </Card>
      </>
    );
  }

  const metrics: Metric[] = data
    ? [
        { label: "Total Leads", value: data.metrics.totalLeadsFound, icon: Users, tone: "primary" },
        { label: "Verified", value: data.metrics.verifiedLeads, icon: ShieldCheck, tone: "success" },
        {
          label: "High Potential",
          value: data.metrics.highPotentialLeads,
          icon: Star,
          tone: "success",
          hint: "Score 80 or above",
        },
        { label: "Pending Approval", value: data.metrics.pendingApproval, icon: CheckSquare, tone: "warning" },
        { label: "Emails Sent", value: data.metrics.emailsSent, icon: Mail },
        { label: "Replies", value: data.metrics.repliesReceived, icon: MessageSquare },
        { label: "Meetings Booked", value: data.metrics.meetingsBooked, icon: CalendarCheck, tone: "success" },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Pipeline health across discovery, verification, approval and outreach."
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/generate">
              <Plus aria-hidden />
              Generate leads
            </Link>
          </Button>
        }
      />

      {isPending || !data ? (
        <div className="space-y-4">
          {/* Matches MetricStrip's height at each breakpoint (4 / 2 / 1 rows),
              so nothing shifts when the real figures arrive. */}
          <Skeleton className="h-[383px] w-full sm:h-[192px] xl:h-[97px]" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Skeleton className="h-72 w-full xl:col-span-2" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <section aria-label="Summary metrics">
            <MetricStrip metrics={metrics} />
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent lead-search requests</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/requests">View all</Link>
                </Button>
              </CardHeader>
              {data.recentRequests.length === 0 ? (
                <EmptyState
                  title="No lead searches yet"
                  description="Start the Opportunity Hunter Agent to discover businesses that match your target market."
                  action={
                    <Button asChild size="sm">
                      <Link href="/dashboard/generate">Generate leads</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-[var(--app-border)]">
                  {data.recentRequests.map((request) => (
                    <li key={request.id}>
                      <Link
                        href={`/dashboard/requests/${request.id}`}
                        className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[var(--app-panel-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {request.categories.join(", ")} · {request.city || request.region || request.country}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">
                            {request.service} · {formatNumber(request.leadsFound)} of{" "}
                            {formatNumber(request.requestedLeadCount)} leads · {formatDate(request.createdAt)}
                          </p>
                        </div>
                        <RequestStatusBadge status={request.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead pipeline summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.pipeline.every((stage) => stage.count === 0) ? (
                  <EmptyState title="The pipeline is empty" description="Stages fill in as leads are discovered." />
                ) : (
                  data.pipeline.map((stage) => {
                    const max = Math.max(...data.pipeline.map((item) => item.count), 1);
                    return (
                      <div key={stage.stage}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs text-[var(--app-text-muted)]">{stage.stage}</span>
                          <span className="text-xs font-semibold tabular-nums">{formatNumber(stage.count)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--app-panel-muted)]">
                          <div
                            className="h-full rounded-full bg-[var(--app-primary)]"
                            style={{ width: `${(stage.count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Latest agent activity</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/activity">View logs</Link>
                </Button>
              </CardHeader>
              <ActivityList events={data.recentActivity} />
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Outreach status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.outreachSummary.length === 0 ? (
                    <EmptyState
                      title="No leads in outreach"
                      description="Approve leads to hand them to the Outreach Agent."
                    />
                  ) : (
                    data.outreachSummary.map((item) => (
                      <div key={item.stage} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-[var(--app-text-muted)]">{item.stage}</span>
                        <span className="font-semibold tabular-nums">{formatNumber(item.count)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Needs review</CardTitle>
                </CardHeader>
                {data.itemsNeedingReview.length === 0 ? (
                  <EmptyState title="Nothing to review" description="Errors and warnings appear here." />
                ) : (
                  <ActivityList events={data.itemsNeedingReview} />
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
