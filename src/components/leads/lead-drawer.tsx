"use client";

import * as React from "react";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  ImageOff,
  FileDown,
  FileSearch,
  Mail,
  MapPin,
  Phone,
  ThumbsDown,
  ThumbsUp,
  User,
  RefreshCw,
} from "lucide-react";

import { ApprovalBadge, OutreachBadge, ScoreBadge, VerificationBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAddNote, useLead, useOutreach, useRegenerateAudit, useRegenerateEmail } from "@/hooks/use-lead-data";
import { formatDateTime, hostnameOf } from "@/lib/format";
import type { Lead } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="w-32 shrink-0 text-xs text-[var(--app-text-muted)]">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-xs font-medium">{children}</dd>
    </div>
  );
}

function NotProvided() {
  return <span className="font-normal text-[var(--app-text-subtle)]">Not provided by the backend</span>;
}

function LeadBody({ lead, onApprove, onReject }: { lead: Lead; onApprove: () => void; onReject: () => void }) {
  const [note, setNote] = React.useState("");
  const addNote = useAddNote(lead.id);
  const outreachQuery = useOutreach();
  const regenerateAudit = useRegenerateAudit(lead.id);
  const regenerateEmail = useRegenerateEmail(lead.id);
  const outreachRecord = (outreachQuery.data ?? []).find((record) => record.leadId === lead.id);

  return (
    <>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <ScoreBadge score={lead.score} />
          <VerificationBadge status={lead.verificationStatus} />
          <ApprovalBadge status={lead.approvalStatus} />
          <OutreachBadge status={lead.outreachStatus} />
          {lead.isPossibleDuplicate ? <Badge tone="warning">Possible duplicate</Badge> : null}
        </div>

        <Tabs defaultValue="business" className="mt-4">
          <TabsList>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="score">Score</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-5">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-subtle)]">
                Business information
              </h3>
              <dl className="mt-1 divide-y divide-[var(--app-border)]">
                <DetailRow label="Company">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-3.5 opacity-60" aria-hidden />
                    {lead.companyName}
                  </span>
                </DetailRow>
                <DetailRow label="Category">{lead.category}</DetailRow>
                <DetailRow label="Location">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 opacity-60" aria-hidden />
                    {[lead.city, lead.region, lead.country].filter(Boolean).join(", ")}
                  </span>
                </DetailRow>
                <DetailRow label="Recommended service">{lead.recommendedService}</DetailRow>
                <DetailRow label="Discovered">{formatDateTime(lead.discoveredAt)}</DetailRow>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-subtle)]">
                Public contact information
              </h3>
              <dl className="mt-1 divide-y divide-[var(--app-border)]">
                <DetailRow label="Website">
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--app-primary)] hover:underline"
                    >
                      {hostnameOf(lead.website)}
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : (
                    <NotProvided />
                  )}
                </DetailRow>
                <DetailRow label="Email">
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Mail className="size-3.5 opacity-60" aria-hidden />
                      {lead.email}
                    </a>
                  ) : (
                    <NotProvided />
                  )}
                </DetailRow>
                <DetailRow label="Phone">
                  {lead.phone ? (
                    <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone className="size-3.5 opacity-60" aria-hidden />
                      {lead.phone}
                    </a>
                  ) : (
                    <NotProvided />
                  )}
                </DetailRow>
                <DetailRow label="Decision maker">
                  {lead.decisionMaker?.name ? (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5 opacity-60" aria-hidden />
                      {lead.decisionMaker.name}
                      {lead.decisionMaker.role ? ` · ${lead.decisionMaker.role}` : ""}
                    </span>
                  ) : (
                    <NotProvided />
                  )}
                </DetailRow>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-subtle)]">
                Website preview
              </h3>
              <div className="mt-2 flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-muted)]">
                {lead.websiteScreenshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lead.websiteScreenshotUrl}
                    alt={`Screenshot of the ${lead.companyName} website`}
                    className="size-full rounded-md object-cover object-top"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-xs text-[var(--app-text-subtle)]">
                    <ImageOff className="size-5" aria-hidden />
                    No screenshot captured for this lead
                  </span>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-subtle)]">
                Website issues found
              </h3>
              {lead.websiteIssues.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--app-text-subtle)]">No issues were reported.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {lead.websiteIssues.map((issue) => (
                    <li key={issue} className="rounded-md bg-amber-warn-50 px-2.5 py-1.5 text-xs text-amber-warn-700 dark:bg-amber-warn-700/20 dark:text-amber-warn-100">
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-subtle)]">
                Opportunity signals
              </h3>
              {lead.opportunitySignals.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--app-text-subtle)]">No signals were reported.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {lead.opportunitySignals.map((signal) => (
                    <li key={signal} className="flex gap-2 text-xs">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-subtle)]">
                Data sources
              </h3>
              {lead.sourceLinks.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--app-text-subtle)]">No source links were recorded.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {lead.sourceLinks.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[var(--app-primary)] hover:underline"
                      >
                        {source.label}
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                      {source.retrievedAt ? (
                        <span className="ml-2 text-[11px] text-[var(--app-text-subtle)]">
                          {formatDateTime(source.retrievedAt)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>

          <TabsContent value="score">
            {!lead.scoreBreakdown ? (
              <EmptyState title="No score breakdown" description="The backend did not return a breakdown for this lead." />
            ) : (
              <div className="space-y-3">
                {lead.scoreBreakdown.components.map((component) => (
                  <div key={component.key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium">{component.label}</span>
                      <span className="text-xs tabular-nums text-[var(--app-text-muted)]">
                        {component.score} / {component.maxScore}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--app-panel-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--app-primary)]"
                        style={{ width: `${(component.score / component.maxScore) * 100}%` }}
                      />
                    </div>
                    {component.rationale ? (
                      <p className="mt-1 text-[11px] text-[var(--app-text-subtle)]">{component.rationale}</p>
                    ) : null}
                  </div>
                ))}
                <p className="border-t border-[var(--app-border)] pt-3 text-xs text-[var(--app-text-muted)]">
                  Total {lead.scoreBreakdown.total} · calculated {formatDateTime(lead.scoreBreakdown.calculatedAt)}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={lead.auditStatus === "audit_completed" ? "success" : lead.auditStatus === "audit_failed" ? "danger" : lead.auditStatus === "audit_needs_review" ? "warning" : "neutral"}>
                {lead.auditStatus.replace(/_/g, " ")}
              </Badge>
              {lead.auditScore !== null ? <Badge tone="info">Audit score {lead.auditScore}</Badge> : null}
              {lead.auditConfidence !== null ? <Badge tone="neutral">Confidence {lead.auditConfidence}%</Badge> : null}
            </div>

            {lead.auditBlockReason ? (
              <div className="rounded-md border border-amber-warn-100 bg-amber-warn-50 p-3 text-xs text-amber-warn-700 dark:border-amber-warn-700 dark:bg-amber-warn-700/20 dark:text-amber-warn-100">
                <p className="font-semibold">Audit or outreach blocked</p>
                <p className="mt-1">{lead.auditBlockReason}</p>
              </div>
            ) : null}

            {lead.audit ? (
              <>
                <dl className="divide-y divide-[var(--app-border)]">
                  <DetailRow label="Final URL">{lead.audit.finalUrl ?? <NotProvided />}</DetailRow>
                  <DetailRow label="HTTP / HTTPS">
                    {lead.audit.httpStatus ?? "—"} · {lead.audit.hasHttps === null ? "Unknown" : lead.audit.hasHttps ? "HTTPS" : "HTTP"}
                  </DetailRow>
                  <DetailRow label="Generated">{formatDateTime(lead.audit.generatedAt)}</DetailRow>
                </dl>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ["Mobile", lead.audit.scores.performanceMobile],
                    ["Desktop", lead.audit.scores.performanceDesktop],
                    ["SEO", lead.audit.scores.seo],
                    ["Accessibility", lead.audit.scores.accessibility],
                    ["Best practices", lead.audit.scores.bestPractices],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-md border border-[var(--app-border)] bg-[var(--app-panel-muted)] p-3">
                      <p className="text-[11px] text-[var(--app-text-muted)]">{label}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">{value ?? "—"}</p>
                    </div>
                  ))}
                </div>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-subtle)]">Verified findings</h3>
                  {lead.audit.findings.length ? (
                    <ul className="mt-2 space-y-2">
                      {lead.audit.findings.map((finding) => (
                        <li key={finding.code} className="rounded-md border border-[var(--app-border)] p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">{finding.title}</p>
                            <Badge tone={finding.priority === "critical" ? "danger" : finding.priority === "high" ? "warning" : "neutral"}>{finding.priority}</Badge>
                          </div>
                          <p className="mt-2 text-[var(--app-text-muted)]"><span className="font-medium text-[var(--app-text)]">Evidence:</span> {finding.evidence}</p>
                          <p className="mt-1 text-[var(--app-text-muted)]"><span className="font-medium text-[var(--app-text)]">Impact:</span> {finding.impact}</p>
                          <p className="mt-1 text-[var(--app-text-muted)]"><span className="font-medium text-[var(--app-text)]">Recommendation:</span> {finding.recommendation}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState title="No verified findings" description="Missing audit data is not treated as a website problem." />}
                </section>
              </>
            ) : <EmptyState icon={FileSearch} title="No audit available" description="Queue this approved lead to generate a verified audit and PDF." />}

            <div className="flex flex-wrap gap-2">
              {lead.audit?.reportAvailable ? (
                <>
                  <Button asChild size="sm" variant="secondary"><a href={`/api/leads/${lead.id}/audit-report`} target="_blank" rel="noopener noreferrer"><FileSearch aria-hidden />Preview PDF</a></Button>
                  <Button asChild size="sm" variant="secondary"><a href={`/api/leads/${lead.id}/audit-report?download=1`}><FileDown aria-hidden />Download PDF</a></Button>
                </>
              ) : null}
              <Button size="sm" variant="secondary" loading={regenerateAudit.isPending} onClick={() => regenerateAudit.mutate()} disabled={Boolean(outreachRecord?.gmailMessageId)}>
                <RefreshCw aria-hidden />Regenerate audit
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="verification">
            {lead.verificationHistory.length === 0 ? (
              <EmptyState title="No verification history" description="No checks have been recorded for this lead." />
            ) : (
              <ul className="divide-y divide-[var(--app-border)]">
                {lead.verificationHistory.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium capitalize">{event.field.replace("_", " ")}</p>
                      {event.detail ? (
                        <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">{event.detail}</p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] text-[var(--app-text-subtle)]">
                        {event.provider ?? "Unknown provider"} · {formatDateTime(event.checkedAt)}
                      </p>
                    </div>
                    <Badge tone={event.result === "valid" ? "success" : event.result === "invalid" ? "danger" : "neutral"}>
                      {event.result}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="outreach">
            {outreachQuery.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : !outreachRecord ? (
              <EmptyState
                title="Not in outreach"
                description="This lead has not been handed to the Outreach Agent yet."
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <OutreachBadge status={outreachRecord.status} />
                  <span className="text-xs text-[var(--app-text-muted)]">
                    Last contacted {formatDateTime(outreachRecord.lastContactedAt)}
                  </span>
                </div>
                {outreachRecord.messages.map((message) => (
                  <article key={message.id} className="rounded-md border border-[var(--app-border)] p-3">
                    <p className="text-xs font-semibold">{message.subject}</p>
                    <p className="mt-1 whitespace-pre-line text-[11px] text-[var(--app-text-muted)]">
                      {message.body}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--app-text-subtle)]">
                      {message.step.replace("_", " ")} · {message.status.replace("_", " ")}
                      {message.sentAt ? ` · ${formatDateTime(message.sentAt)}` : ""}
                    </p>
                  </article>
                ))}
                {outreachRecord.messages.some((message) => message.status !== "sent") ? (
                  <Button size="sm" variant="secondary" loading={regenerateEmail.isPending} onClick={() => regenerateEmail.mutate()}>
                    <RefreshCw aria-hidden />Regenerate email
                  </Button>
                ) : null}
                {outreachRecord.gmailMessageId ? (
                  <p className="text-[11px] text-[var(--app-text-subtle)]">Gmail message {outreachRecord.gmailMessageId} · thread {outreachRecord.gmailThreadId ?? "pending"}</p>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!note.trim()) return;
                addNote.mutate(note.trim(), { onSuccess: () => setNote("") });
              }}
              className="space-y-2"
            >
              <label htmlFor="lead-note" className="text-xs font-medium">
                Add an internal note
              </label>
              <Textarea
                id="lead-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Visible to your team only"
              />
              <Button type="submit" size="sm" loading={addNote.isPending} disabled={!note.trim()}>
                Save note
              </Button>
            </form>

            {lead.notes.length === 0 ? (
              <EmptyState title="No notes yet" description="Notes your team adds appear here." />
            ) : (
              <ul className="divide-y divide-[var(--app-border)]">
                {lead.notes.map((item) => (
                  <li key={item.id} className="py-2.5">
                    <p className="text-xs">{item.body}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--app-text-subtle)]">
                      {item.author} · {formatDateTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex gap-2 border-t border-[var(--app-border)] px-5 py-3">
        <Button
          variant="success"
          className="flex-1"
          onClick={onApprove}
          disabled={lead.approvalStatus === "approved"}
        >
          <ThumbsUp aria-hidden />
          {lead.approvalStatus === "approved" ? "Approved" : "Approve"}
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={onReject}
          disabled={lead.approvalStatus === "rejected"}
        >
          <ThumbsDown aria-hidden />
          {lead.approvalStatus === "rejected" ? "Rejected" : "Reject"}
        </Button>
      </div>
    </>
  );
}

export function LeadDrawer({
  leadId,
  onOpenChange,
  onApprove,
  onReject,
}: {
  leadId: string | null;
  onOpenChange: (open: boolean) => void;
  onApprove: (leadId: string) => void;
  onReject: (leadId: string) => void;
}) {
  const { data: lead, isPending, isError, error, refetch } = useLead(leadId);

  return (
    <Drawer open={Boolean(leadId)} onOpenChange={onOpenChange}>
      <DrawerContent aria-describedby="lead-drawer-description">
        <div className="border-b border-[var(--app-border)] px-5 py-4 pr-12">
          <DrawerTitle className="truncate text-base font-semibold">
            {lead?.companyName ?? "Lead details"}
          </DrawerTitle>
          <DrawerDescription id="lead-drawer-description" className="text-xs text-[var(--app-text-muted)]">
            {lead
              ? `${lead.category} · ${[lead.city, lead.country].filter(Boolean).join(", ")}`
              : "Complete business, verification and outreach detail."}
          </DrawerDescription>
        </div>

        {isPending && leadId ? (
          <div className="flex-1 space-y-3 p-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <ErrorState
            className="flex-1"
            title="This lead could not be loaded"
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        ) : lead ? (
          <LeadBody lead={lead} onApprove={() => onApprove(lead.id)} onReject={() => onReject(lead.id)} />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
