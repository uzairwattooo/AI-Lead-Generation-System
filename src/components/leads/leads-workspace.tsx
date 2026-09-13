"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  ExternalLink,
  Filter,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

import { LeadDrawer } from "@/components/leads/lead-drawer";
import { RejectDialog } from "@/components/leads/reject-dialog";
import {
  ApprovalBadge,
  OutreachBadge,
  ScoreBadge,
  VerificationBadge,
} from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  useApproveLeads,
  useLeads,
  useRejectLeads,
  useSendToOutreach,
} from "@/hooks/use-lead-data";
import {
  OUTREACH_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "@/lib/constants";
import { downloadCsv, leadsToCsv } from "@/lib/csv";
import { formatDate, formatNumber, hostnameOf } from "@/lib/format";
import type { LeadListFilters } from "@/services/lead-service";
import type { Lead, OutreachStatus, VerificationStatus } from "@/types";

/* -------------------------------------------------------------------------- */
/* Column definitions                                                         */
/* -------------------------------------------------------------------------- */

const COLUMNS = [
  { key: "companyName", label: "Company", sortable: true, alwaysVisible: true },
  { key: "category", label: "Category", sortable: true },
  { key: "location", label: "Location", sortable: true },
  { key: "website", label: "Website" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "decisionMaker", label: "Decision maker" },
  { key: "opportunitySignal", label: "Opportunity signal" },
  { key: "recommendedService", label: "Recommended service" },
  { key: "score", label: "Lead score", sortable: true },
  { key: "verification", label: "Verification" },
  { key: "approval", label: "Approval" },
  { key: "outreach", label: "Outreach" },
  { key: "source", label: "Source" },
  { key: "discoveredAt", label: "Discovered", sortable: true },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

const DEFAULT_HIDDEN: ColumnKey[] = ["phone", "recommendedService", "source"];

const VERIFICATION_OPTIONS: VerificationStatus[] = ["verified", "pending", "unverified", "invalid"];
const OUTREACH_OPTIONS: OutreachStatus[] = [
  "not_queued",
  "queued",
  "initial_email_sent",
  "follow_up_1",
  "follow_up_2",
  "follow_up_3",
  "replied",
  "interested",
  "not_interested",
  "do_not_contact",
  "calling_queue",
  "meeting_booked",
  "needs_human_review",
];

const SCORE_BANDS = [
  { value: "all", label: "Any score", min: undefined, max: undefined },
  { value: "high", label: "High potential (80-100)", min: 80, max: 100 },
  { value: "medium", label: "Medium potential (60-79)", min: 60, max: 79 },
  { value: "low", label: "Low potential (below 60)", min: 0, max: 59 },
] as const;

export interface LeadsWorkspaceProps {
  /** Locks the approval filter, used by the Approval Queue page. */
  lockedApproval?: string[];
  requestId?: string;
  /** Shown when the (filtered) result set is empty. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Approval-queue mode surfaces duplicate and missing-data warnings. */
  showWarnings?: boolean;
  minimumApprovalScore?: number;
}

export function LeadsWorkspace({
  lockedApproval,
  requestId,
  emptyTitle = "No leads match these filters",
  emptyDescription = "Adjust the filters, or run a new lead search to discover more businesses.",
  showWarnings = false,
  minimumApprovalScore,
}: LeadsWorkspaceProps) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [location, setLocation] = React.useState("");
  const [verification, setVerification] = React.useState<string[]>([]);
  const [outreach, setOutreach] = React.useState<string[]>([]);
  const [scoreBand, setScoreBand] = React.useState<(typeof SCORE_BANDS)[number]["value"]>("all");
  const [sortBy, setSortBy] = React.useState("score");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [hiddenColumns, setHiddenColumns] = React.useState<ColumnKey[]>(DEFAULT_HIDDEN);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [openLeadId, setOpenLeadId] = React.useState<string | null>(null);
  const [rejectTargets, setRejectTargets] = React.useState<string[] | null>(null);
  const [outreachConfirm, setOutreachConfirm] = React.useState(false);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const band = SCORE_BANDS.find((item) => item.value === scoreBand) ?? SCORE_BANDS[0];

  const filters: LeadListFilters = React.useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      requestId,
      categories,
      location,
      verification,
      outreach,
      approval: lockedApproval ?? [],
      minScore: band.min,
      maxScore: band.max,
      sortBy,
      sortDir,
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      requestId,
      categories,
      location,
      verification,
      outreach,
      lockedApproval,
      band.min,
      band.max,
      sortBy,
      sortDir,
    ],
  );

  const { data, isPending, isFetching, isError, error, refetch } = useLeads(filters);
  const approveMutation = useApproveLeads();
  const rejectMutation = useRejectLeads();
  const outreachMutation = useSendToOutreach();

  const leads = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visibleColumns = COLUMNS.filter((column) => !hiddenColumns.includes(column.key));

  const allSelected = leads.length > 0 && leads.every((lead) => selected.includes(lead.id));
  const someSelected = leads.some((lead) => selected.includes(lead.id));

  const selectedLeads = leads.filter((lead) => selected.includes(lead.id));
  const approvedSelected = selectedLeads.filter((lead) => lead.approvalStatus === "approved");

  const activeFilterCount =
    categories.length + verification.length + outreach.length + (location ? 1 : 0) + (scoreBand !== "all" ? 1 : 0);

  const toggleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setCategories([]);
    setVerification([]);
    setOutreach([]);
    setLocation("");
    setScoreBand("all");
    setSearch("");
    setPage(1);
  };

  const toggleAll = () => {
    setSelected((current) =>
      allSelected
        ? current.filter((id) => !leads.some((lead) => lead.id === id))
        : [...new Set([...current, ...leads.map((lead) => lead.id)])],
    );
  };

  const exportCsv = () => {
    const rows = selectedLeads.length > 0 ? selectedLeads : leads;
    downloadCsv(`codenativex-leads-${new Date().toISOString().slice(0, 10)}.csv`, leadsToCsv(rows));
  };

  const warningsFor = (lead: Lead): string[] => {
    if (!showWarnings) return [];
    const warnings: string[] = [];
    if (lead.isPossibleDuplicate) warnings.push("Possible duplicate");
    if (!lead.email) warnings.push("No email");
    if (!lead.phone) warnings.push("No phone");
    if (!lead.decisionMaker?.name) warnings.push("No decision maker");
    if (typeof minimumApprovalScore === "number" && lead.score < minimumApprovalScore) {
      warnings.push(`Below the minimum score of ${minimumApprovalScore}`);
    }
    return warnings;
  };

  return (
    <>
      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--app-text-subtle)]"
                aria-hidden
              />
              <label htmlFor="lead-search" className="sr-only">
                Search leads
              </label>
              <Input
                id="lead-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search company, email, website or contact"
                className="pl-8"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={scoreBand}
                onValueChange={(value) => {
                  setScoreBand(value as typeof scoreBand);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-48" aria-label="Filter by lead score">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCORE_BANDS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="md">
                    <Filter aria-hidden />
                    Filters
                    {activeFilterCount > 0 ? (
                      <Badge tone="info" className="ml-1">
                        {activeFilterCount}
                      </Badge>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Category</DropdownMenuLabel>
                  {(data?.facets.categories ?? []).length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-[var(--app-text-subtle)]">No categories yet</p>
                  ) : (
                    data?.facets.categories.map((category) => (
                      <DropdownMenuCheckboxItem
                        key={category}
                        checked={categories.includes(category)}
                        onCheckedChange={() => {
                          setCategories((current) =>
                            current.includes(category)
                              ? current.filter((item) => item !== category)
                              : [...current, category],
                          );
                          setPage(1);
                        }}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {category}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Verification</DropdownMenuLabel>
                  {VERIFICATION_OPTIONS.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={verification.includes(status)}
                      onCheckedChange={() => {
                        setVerification((current) =>
                          current.includes(status)
                            ? current.filter((item) => item !== status)
                            : [...current, status],
                        );
                        setPage(1);
                      }}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {VERIFICATION_STATUS_LABELS[status]}
                    </DropdownMenuCheckboxItem>
                  ))}

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Outreach status</DropdownMenuLabel>
                  <div className="max-h-48 overflow-y-auto">
                    {OUTREACH_OPTIONS.map((status) => (
                      <DropdownMenuCheckboxItem
                        key={status}
                        checked={outreach.includes(status)}
                        onCheckedChange={() => {
                          setOutreach((current) =>
                            current.includes(status)
                              ? current.filter((item) => item !== status)
                              : [...current, status],
                          );
                          setPage(1);
                        }}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {OUTREACH_STATUS_LABELS[status]}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>

                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <Label htmlFor="location-filter">Location contains</Label>
                    <Input
                      id="location-filter"
                      value={location}
                      onChange={(event) => {
                        setLocation(event.target.value);
                        setPage(1);
                      }}
                      placeholder="City, region or country"
                      className="mt-1 h-8"
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="md">
                    <Columns3 aria-hidden />
                    <span className="hidden sm:inline">Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  {COLUMNS.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={!hiddenColumns.includes(column.key)}
                      disabled={"alwaysVisible" in column && column.alwaysVisible}
                      onCheckedChange={() =>
                        setHiddenColumns((current) =>
                          current.includes(column.key)
                            ? current.filter((item) => item !== column.key)
                            : [...current, column.key],
                        )
                      }
                      onSelect={(event) => event.preventDefault()}
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="secondary" onClick={exportCsv} disabled={leads.length === 0}>
                <Download aria-hidden />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </div>
          </div>

          {activeFilterCount > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--app-text-muted)]">
                {formatNumber(total)} lead{total === 1 ? "" : "s"} match the current filters
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X aria-hidden />
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>

        {selected.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-[var(--app-border)] bg-cobalt-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:bg-cobalt-900/25">
            <p className="text-xs font-medium">
              {selected.length} lead{selected.length === 1 ? "" : "s"} selected
              {approvedSelected.length > 0 ? ` · ${approvedSelected.length} approved` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="success"
                loading={approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate(selected, { onSuccess: () => setSelected([]) })
                }
              >
                <ThumbsUp aria-hidden />
                Approve selected
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setRejectTargets(selected)}>
                <ThumbsDown aria-hidden />
                Reject selected
              </Button>
              <Button
                size="sm"
                onClick={() => setOutreachConfirm(true)}
                disabled={approvedSelected.length === 0}
              >
                <Send aria-hidden />
                Send to outreach
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {isPending ? (
          <TableSkeleton rows={8} columns={7} />
        ) : isError ? (
          <ErrorState
            title="Leads could not be loaded"
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        ) : leads.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <TableWrapper className={isFetching ? "opacity-70 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-9">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label="Select all leads on this page"
                    />
                  </TableHead>
                  {visibleColumns.map((column) => (
                    <TableHead key={column.key}>
                      {"sortable" in column && column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className="inline-flex items-center gap-1 rounded-sm hover:text-[var(--app-text)]"
                          aria-label={`Sort by ${column.label}`}
                        >
                          {column.label}
                          {sortBy === column.key ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="size-3" aria-hidden />
                            ) : (
                              <ArrowDown className="size-3" aria-hidden />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" aria-hidden />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const isSelected = selected.includes(lead.id);
                  const warnings = warningsFor(lead);
                  return (
                    <TableRow key={lead.id} data-selected={isSelected}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            setSelected((current) =>
                              current.includes(lead.id)
                                ? current.filter((id) => id !== lead.id)
                                : [...current, lead.id],
                            )
                          }
                          aria-label={`Select ${lead.companyName}`}
                        />
                      </TableCell>

                      {visibleColumns.map((column) => (
                        <TableCell key={column.key} className="max-w-56">
                          {column.key === "companyName" ? (
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setOpenLeadId(lead.id)}
                                className="truncate text-left text-sm font-medium text-[var(--app-text)] hover:text-[var(--app-primary)] hover:underline"
                              >
                                {lead.companyName}
                              </button>
                              {warnings.length > 0 ? (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {warnings.map((warning) => (
                                    <Badge key={warning} tone="warning">
                                      {warning}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : column.key === "category" ? (
                            <span className="truncate text-xs">{lead.category}</span>
                          ) : column.key === "location" ? (
                            <span className="truncate text-xs">
                              {[lead.city, lead.country].filter(Boolean).join(", ")}
                            </span>
                          ) : column.key === "website" ? (
                            lead.website ? (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 truncate text-xs text-[var(--app-primary)] hover:underline"
                              >
                                {hostnameOf(lead.website)}
                                <ExternalLink className="size-3 shrink-0" aria-hidden />
                              </a>
                            ) : (
                              <span className="text-xs text-[var(--app-text-subtle)]">—</span>
                            )
                          ) : column.key === "email" ? (
                            lead.email ? (
                              <span className="block truncate text-xs">{lead.email}</span>
                            ) : (
                              <span className="text-xs text-[var(--app-text-subtle)]">—</span>
                            )
                          ) : column.key === "phone" ? (
                            <span className="whitespace-nowrap text-xs">
                              {lead.phone ?? <span className="text-[var(--app-text-subtle)]">—</span>}
                            </span>
                          ) : column.key === "decisionMaker" ? (
                            <span className="block truncate text-xs">
                              {lead.decisionMaker?.name ?? (
                                <span className="text-[var(--app-text-subtle)]">—</span>
                              )}
                            </span>
                          ) : column.key === "opportunitySignal" ? (
                            <span className="block truncate text-xs text-[var(--app-text-muted)]">
                              {lead.opportunitySignals[0] ?? "—"}
                            </span>
                          ) : column.key === "recommendedService" ? (
                            <span className="block truncate text-xs">{lead.recommendedService}</span>
                          ) : column.key === "score" ? (
                            <ScoreBadge score={lead.score} />
                          ) : column.key === "verification" ? (
                            <VerificationBadge status={lead.verificationStatus} />
                          ) : column.key === "approval" ? (
                            <ApprovalBadge status={lead.approvalStatus} />
                          ) : column.key === "outreach" ? (
                            <OutreachBadge status={lead.outreachStatus} />
                          ) : column.key === "source" ? (
                            lead.sourceLinks[0] ? (
                              <a
                                href={lead.sourceLinks[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[var(--app-primary)] hover:underline"
                              >
                                Source
                                <ExternalLink className="size-3" aria-hidden />
                              </a>
                            ) : (
                              <span className="text-xs text-[var(--app-text-subtle)]">—</span>
                            )
                          ) : (
                            <span className="whitespace-nowrap text-xs text-[var(--app-text-muted)]">
                              {formatDate(lead.discoveredAt)}
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>
        )}

        {leads.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-[var(--app-border)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-xs text-[var(--app-text-muted)]">
              Showing {formatNumber((page - 1) * pageSize + 1)} to{" "}
              {formatNumber(Math.min(page * pageSize, total))} of {formatNumber(total)}
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-28" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} rows
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft aria-hidden />
              </Button>
              <span className="text-xs tabular-nums text-[var(--app-text-muted)]">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <LeadDrawer
        leadId={openLeadId}
        onOpenChange={(open) => !open && setOpenLeadId(null)}
        onApprove={(leadId) => approveMutation.mutate([leadId])}
        onReject={(leadId) => setRejectTargets([leadId])}
      />

      <RejectDialog
        open={rejectTargets !== null}
        onOpenChange={(open) => !open && setRejectTargets(null)}
        count={rejectTargets?.length ?? 0}
        loading={rejectMutation.isPending}
        onConfirm={(reason, note) => {
          if (!rejectTargets) return;
          rejectMutation.mutate(
            { leadIds: rejectTargets, reason, note },
            {
              onSuccess: () => {
                setRejectTargets(null);
                setSelected([]);
              },
            },
          );
        }}
      />

      <Dialog open={outreachConfirm} onOpenChange={setOutreachConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send approved leads to outreach?</DialogTitle>
            <DialogDescription>
              The Outreach Agent will generate a personalised first email for each lead. Only approved
              leads are queued.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-xs text-[var(--app-text-muted)]">
              {approvedSelected.length} of {selected.length} selected lead
              {selected.length === 1 ? "" : "s"} will be queued.
            </p>
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs">
              {approvedSelected.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{lead.companyName}</span>
                  <span className="shrink-0 text-[var(--app-text-subtle)]">
                    {lead.email ?? "No email"}
                  </span>
                </li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOutreachConfirm(false)}>
              Cancel
            </Button>
            <Button
              loading={outreachMutation.isPending}
              onClick={() =>
                outreachMutation.mutate(
                  approvedSelected.map((lead) => lead.id),
                  {
                    onSuccess: () => {
                      setOutreachConfirm(false);
                      setSelected([]);
                    },
                  },
                )
              }
            >
              <Send aria-hidden />
              Send to outreach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
