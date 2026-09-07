"use client";

import * as React from "react";
import { CheckCircle2, MessageSquare, Phone, RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ReplyBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCallQueue, useMarkReplyHandled, useReplies } from "@/hooks/use-lead-data";
import { REPLY_CLASSIFICATION_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ReplyClassification } from "@/types";

const TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All replies" },
  { value: "interested", label: REPLY_CLASSIFICATION_LABELS.interested },
  { value: "pricing_question", label: REPLY_CLASSIFICATION_LABELS.pricing_question },
  { value: "meeting_request", label: REPLY_CLASSIFICATION_LABELS.meeting_request },
  { value: "unclear", label: REPLY_CLASSIFICATION_LABELS.unclear },
  { value: "not_interested", label: REPLY_CLASSIFICATION_LABELS.not_interested },
  { value: "do_not_contact", label: REPLY_CLASSIFICATION_LABELS.do_not_contact },
];

export function RepliesClient() {
  const repliesQuery = useReplies();
  const callQueueQuery = useCallQueue();
  const markHandled = useMarkReplyHandled();
  const [tab, setTab] = React.useState("all");

  const replies = (repliesQuery.data ?? []).filter(
    (reply) => tab === "all" || reply.classification === (tab as ReplyClassification),
  );

  return (
    <>
      <PageHeader
        title="Replies"
        description="Incoming replies classified by the Outreach Agent. Anything it cannot classify is escalated for human review."
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
              {item.value !== "all" ? (
                <span className="tabular-nums opacity-60">
                  {(repliesQuery.data ?? []).filter((reply) => reply.classification === item.value).length}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          {repliesQuery.isPending ? (
            <TableSkeleton rows={6} columns={4} />
          ) : repliesQuery.isError ? (
            <ErrorState
              title="Replies could not be loaded"
              description={
                repliesQuery.error instanceof Error ? repliesQuery.error.message : undefined
              }
              onRetry={() => void repliesQuery.refetch()}
            />
          ) : replies.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No replies in this category"
              description="Replies appear here once contacted leads respond."
            />
          ) : (
            <ul className="divide-y divide-[var(--app-border)]">
              {replies.map((reply) => (
                <li key={reply.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{reply.companyName}</p>
                      <p className="truncate text-xs text-[var(--app-text-muted)]">{reply.fromEmail}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ReplyBadge classification={reply.classification} />
                      <Badge tone="outline">{Math.round(reply.confidence * 100)}% confidence</Badge>
                      {reply.requiresHumanReview ? <Badge tone="warning">Needs review</Badge> : null}
                      {reply.handled ? <Badge tone="success">Handled</Badge> : null}
                    </div>
                  </div>

                  <p className="mt-2 text-xs font-medium text-[var(--app-text)]">{reply.subject}</p>
                  <p className="mt-1 text-xs text-[var(--app-text-muted)]">{reply.body}</p>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--app-text-subtle)]">
                      Received {formatDateTime(reply.receivedAt)}
                    </span>
                    <Button
                      variant={reply.handled ? "ghost" : "secondary"}
                      size="sm"
                      loading={markHandled.isPending && markHandled.variables?.replyId === reply.id}
                      onClick={() =>
                        markHandled.mutate({ replyId: reply.id, handled: !reply.handled })
                      }
                    >
                      {reply.handled ? <RotateCcw aria-hidden /> : <CheckCircle2 aria-hidden />}
                      {reply.handled ? "Reopen" : "Mark handled"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Calling queue</CardTitle>
          </CardHeader>
          {callQueueQuery.isPending ? (
            <TableSkeleton rows={4} columns={3} />
          ) : callQueueQuery.isError ? (
            <ErrorState
              title="The calling queue could not be loaded"
              onRetry={() => void callQueueQuery.refetch()}
            />
          ) : (callQueueQuery.data ?? []).length === 0 ? (
            <EmptyState
              icon={Phone}
              title="No calls queued"
              description="Leads that need a phone call appear here."
            />
          ) : (
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(callQueueQuery.data ?? []).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <p className="text-xs font-medium">{entry.companyName}</p>
                        <p className="text-[11px] text-[var(--app-text-subtle)]">{entry.reason}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {entry.phone ? (
                          <a href={`tel:${entry.phone}`} className="hover:underline">
                            {entry.phone}
                          </a>
                        ) : (
                          <span className="text-[var(--app-text-subtle)]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          tone={
                            entry.priority === "high"
                              ? "warning"
                              : entry.priority === "low"
                                ? "neutral"
                                : "info"
                          }
                        >
                          {entry.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          )}
        </Card>
      </div>
    </>
  );
}
