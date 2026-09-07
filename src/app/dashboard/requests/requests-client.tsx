"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { RequestStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from "@/components/ui/table";
import { useRequests } from "@/hooks/use-lead-data";
import { formatDateTime, formatNumber } from "@/lib/format";

export function RequestsClient() {
  const { data, isPending, isError, error, refetch } = useRequests();

  return (
    <>
      <PageHeader
        title="Lead Requests"
        description="Every Opportunity Hunter run, with its criteria, status and results."
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/generate">
              <Plus aria-hidden />
              New search
            </Link>
          </Button>
        }
      />

      <Card>
        {isPending ? (
          <TableSkeleton rows={6} columns={6} />
        ) : isError ? (
          <ErrorState
            title="Lead requests could not be loaded"
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        ) : data.length === 0 ? (
          <EmptyState
            title="No lead searches yet"
            description="Run your first search to start discovering businesses that match your target market."
            action={
              <Button asChild size="sm">
                <Link href="/dashboard/generate">Generate leads</Link>
              </Button>
            }
          />
        ) : (
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {[request.city, request.region, request.country].filter(Boolean).join(", ")}
                      <span className="block text-[11px] font-normal text-[var(--app-text-subtle)]">
                        {request.radiusKm} km radius · {request.leadType}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{request.categories.join(", ")}</TableCell>
                    <TableCell className="max-w-40 truncate">{request.service}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(request.leadsFound)} / {formatNumber(request.requestedLeadCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(request.verifiedLeads)}</TableCell>
                    <TableCell>
                      <RequestStatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-[var(--app-text-muted)]">
                      {formatDateTime(request.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/requests/${request.id}`}>
                          Open
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </Card>
    </>
  );
}
