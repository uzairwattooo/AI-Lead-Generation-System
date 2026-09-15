"use client";

import * as React from "react";
import { Eye, FileDown, Mail, RefreshCw, Send } from "lucide-react";

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
import { useApproveOutreachMessage, useOutreach, useRegenerateEmail } from "@/hooks/use-lead-data";
import { OUTREACH_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { OutreachRecord, OutreachStatus } from "@/types";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "email_draft_ready", label: OUTREACH_STATUS_LABELS.email_draft_ready },
  { value: "awaiting_approval", label: OUTREACH_STATUS_LABELS.awaiting_approval },
  { value: "queued", label: OUTREACH_STATUS_LABELS.queued },
  { value: "awaiting_reply", label: OUTREACH_STATUS_LABELS.awaiting_reply },
  { value: "outreach_failed", label: OUTREACH_STATUS_LABELS.outreach_failed },
  { value: "outreach_blocked", label: OUTREACH_STATUS_LABELS.outreach_blocked },
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
  const regenerateEmail = useRegenerateEmail(preview?.leadId ?? "");

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
                  <TableHead>Audit</TableHead>
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
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-1">
                        <Badge tone={record.auditStatus === "audit_completed" ? "success" : record.auditStatus === "audit_failed" ? "danger" : record.auditStatus === "audit_needs_review" ? "warning" : "neutral"}>
                          {record.auditStatus.replace(/_/g, " ")}
                        </Badge>
                        {record.auditScore !== null ? <span className="text-xs tabular-nums">{record.auditScore}</span> : null}
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
            {preview?.auditBlockReason ? (
              <div className="rounded-md border border-amber-warn-100 bg-amber-warn-50 p-3 text-xs text-amber-warn-700 dark:border-amber-warn-700 dark:bg-amber-warn-700/20 dark:text-amber-warn-100">
                <p className="font-semibold">Blocked reason</p>
                <p className="mt-1">{preview.auditBlockReason}</p>
              </div>
            ) : null}
            {preview?.auditReportAvailable ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--app-border)] p-3">
                <div className="min-w-0"><p className="text-xs font-medium">{preview.auditReportFilename ?? "Website audit report"}</p><p className="text-[11px] text-[var(--app-text-muted)]">Attached when the approved email is sent.</p></div>
                <Button asChild variant="secondary" size="sm"><a href={`/api/leads/${preview.leadId}/audit-report`} target="_blank" rel="noopener noreferrer"><FileDown aria-hidden />Preview PDF</a></Button>
              </div>
            ) : null}
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
            {preview?.gmailMessageId ? <p className="text-[11px] text-[var(--app-text-subtle)]">Gmail message {preview.gmailMessageId} · thread {preview.gmailThreadId ?? "pending"}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Close
            </Button>
            {preview && pendingMessage ? (
              <>
                <Button variant="secondary" loading={regenerateEmail.isPending} onClick={() => regenerateEmail.mutate()}><RefreshCw aria-hidden />Regenerate</Button>
                <Button
                  loading={approveMessage.isPending}
                  disabled={!preview.auditReportAvailable || preview.auditStatus !== "audit_completed"}
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
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
