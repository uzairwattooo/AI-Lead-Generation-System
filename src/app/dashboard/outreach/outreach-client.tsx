"use client";

import * as React from "react";
import { Eye, Mail, Send } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { OutreachBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApproveOutreachMessage, useOutreach } from "@/hooks/use-lead-data";
import { OUTREACH_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { OutreachRecord, OutreachStatus } from "@/types";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "queued", label: OUTREACH_STATUS_LABELS.queued },
  { value: "initial_email_sent", label: OUTREACH_STATUS_LABELS.initial_email_sent },
  { value: "follow_up_1", label: OUTREACH_STATUS_LABELS.follow_up_1 },
  { value: "follow_up_2", label: OUTREACH_STATUS_LABELS.follow_up_2 },
  { value: "follow_up_3", label: OUTREACH_STATUS_LABELS.follow_up_3 },
  { value: "replied", label: OUTREACH_STATUS_LABELS.replied },
  { value: "interested", label: OUTREACH_STATUS_LABELS.interested },
  { value: "not_interested", label: OUTREACH_STATUS_LABELS.not_interested },
  { value: "do_not_contact", label: OUTREACH_STATUS_LABELS.do_not_contact },
  { value: "calling_queue", label: OUTREACH_STATUS_LABELS.calling_queue },
  { value: "meeting_booked", label: OUTREACH_STATUS_LABELS.meeting_booked },
  { value: "needs_human_review", label: OUTREACH_STATUS_LABELS.needs_human_review },
];

export function OutreachClient() {
  const { data, isPending, isError, error, refetch } = useOutreach();
  const approveMessage = useApproveOutreachMessage();
  const [tab, setTab] = React.useState("all");
  const [preview, setPreview] = React.useState<OutreachRecord | null>(null);

  const records = (data ?? []).filter(
    (record) => tab === "all" || record.status === (tab as OutreachStatus),
  );
  const pendingMessage = preview?.messages.find((message) => message.status === "awaiting_approval");

  return (
    <>
      <PageHeader
        title="Outreach"
        description="Approved leads and the progress of their email sequences. Emails that require approval are not sent until you review them."
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          {STATUS_TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
              {item.value !== "all" ? (
                <span className="tabular-nums opacity-60">
                  {(data ?? []).filter((record) => record.status === item.value).length}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        {isPending ? (
          <TableSkeleton rows={6} columns={5} />
        ) : isError ? (
          <ErrorState
            title="Outreach records could not be loaded"
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Nothing in this stage"
            description="Approve leads and send them to outreach to populate this view."
          />
        ) : (
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last contacted</TableHead>
                  <TableHead>Next action</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.companyName}</TableCell>
                    <TableCell className="max-w-56 truncate text-xs">
                      {record.email ?? <span className="text-[var(--app-text-subtle)]">No email</span>}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <OutreachBadge status={record.status} />
                        {record.requiresApproval ? <Badge tone="warning">Approval required</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-[var(--app-text-muted)]">
                      {formatDateTime(record.lastContactedAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-[var(--app-text-muted)]">
                      {formatDateTime(record.nextActionAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setPreview(record)}>
                        <Eye aria-hidden />
                        Review email
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </Card>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.companyName}</DialogTitle>
            <DialogDescription>
              {preview?.email ?? "No email address"} · {preview ? OUTREACH_STATUS_LABELS[preview.status] : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {preview?.messages.length === 0 ? (
              <EmptyState
                title="No message generated yet"
                description="The Outreach Agent has not written an email for this lead."
              />
            ) : (
              preview?.messages.map((message) => (
                <article key={message.id} className="rounded-md border border-[var(--app-border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-subtle)]">
                      {message.step.replace(/_/g, " ")}
                    </span>
                    <Badge
                      tone={
                        message.status === "sent"
                          ? "success"
                          : message.status === "failed"
                            ? "danger"
                            : message.status === "awaiting_approval"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {message.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium">{message.subject}</p>
                  <p className="mt-2 whitespace-pre-line text-xs text-[var(--app-text-muted)]">
                    {message.body}
                  </p>
                  {message.sentAt ? (
                    <p className="mt-2 text-[11px] text-[var(--app-text-subtle)]">
                      Sent {formatDateTime(message.sentAt)}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Close
            </Button>
            {preview && pendingMessage ? (
              <Button
                loading={approveMessage.isPending}
                onClick={() =>
                  approveMessage.mutate(
                    { outreachId: preview.id, messageId: pendingMessage.id },
                    { onSuccess: () => setPreview(null) },
                  )
                }
              >
                <Send aria-hidden />
                Approve and send
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
