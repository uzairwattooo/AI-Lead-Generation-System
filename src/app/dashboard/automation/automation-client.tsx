"use client";
import { AutomationDiscoveryForm } from "@/components/discovery/automation-discovery-form";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { apiGet, apiSend } from "@/services/http";
import type { Opportunity, Outbox } from "@/server/automation/service";
type Job = {
  id: string;
  category: string;
  city: string;
  region?: string;
  country?: string;
  kind: string;
  status: string;
  result_count: number;
  error: string | null;
};
type Data = {
  opportunities: Opportunity[];
  outbox: Outbox[];
  jobs: Job[];
  updatedAt: string;
  limit: number;
};
const inputClass =
  "w-full rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-sm text-[var(--app-text)]";
export default function AutomationClient() {
  const client = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [filter, setFilter] = useState("");
  const [editor, setEditor] = useState<Outbox | null>(null);
  const query = useQuery({
    queryKey: ["automation-opportunities"],
    queryFn: ({ signal }) => apiGet<Data>("/api/automation", signal),
    refetchInterval: 15000,
  });
  const action = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiSend("/api/automation", "POST", payload),
    onSuccess: () => {
      toast.success("Saved");
      void client.invalidateQueries({ queryKey: ["automation-opportunities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = (query.data?.opportunities || []).filter(
    (p) =>
      (tab === "requests"
        ? p.kind === "buyer_request"
        : p.kind === "business" &&
          (tab === "all" || p.review_status === tab)) &&
      `${p.company_name} ${p.city} ${p.email || ""}`
        .toLowerCase()
        .includes(filter.toLowerCase()),
  );
  const submitImport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    action.mutate({
      action: "import",
      input: {
        company_name: f.get("company_name"),
        category: f.get("category"),
        city: f.get("city"),
        country: f.get("country"),
        website: f.get("website"),
        source_url: f.get("source_url"),
        excerpt: f.get("excerpt"),
        email: String(f.get("email") || "").trim() || null,
      },
    });
  };
  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[var(--app-primary)]">
            <Bot className="size-5" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Agent services
            </span>
          </div>
          <h1 className="text-2xl font-semibold">
            AI Automation Opportunities
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--app-text-muted)]">
            Find online stores and social sellers that may benefit from delivery,
            shipping, product and order-support assistants. Review public evidence,
            approve the business, then review its professional email. Other business
            categories remain available.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </header>
      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <h2 className="mb-3 font-semibold">Discover opportunities</h2>
        <AutomationDiscoveryForm />
      </section>
      {query.isError ? (
        <div role="alert" className="rounded-lg border border-amber-500 p-4">
          <h2 className="font-semibold">
            Live opportunities could not be loaded
          </h2>
          <p className="mt-1 text-sm">{query.error.message}</p>
          <p className="mt-2 text-xs">
            Apply the included automation migration and check the server
            configuration. No sample records were substituted.
          </p>
        </div>
      ) : null}
      <details className="rounded-lg border border-[var(--app-border)] p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Add a business from a public source
        </summary>
        <p className="my-3 text-xs text-[var(--app-text-muted)]">
          Paste an exact excerpt from an official business page. The server
          checks its identity and published email. Missing email stays for
          review.
        </p>
        <form onSubmit={submitImport} className="grid gap-3 md:grid-cols-2">
          {[
            ["company_name", "Business name"],
            ["category", "Category"],
            ["city", "City"],
            ["country", "Country"],
            ["website", "Official website"],
            ["source_url", "Exact official source page"],
            ["email", "Published business email (optional)"],
          ].map(([name, label]) => (
            <label key={name} className="text-xs">
              {label}
              <input
                className={inputClass}
                name={name}
                type={
                  name === "email"
                    ? "email"
                    : name === "website" || name === "source_url"
                      ? "url"
                      : "text"
                }
                required={name !== "email"}
                maxLength={
                  name === "website" || name === "source_url" ? 2000 : 160
                }
              />
            </label>
          ))}
          <label className="text-xs">
            Exact public excerpt
            <textarea
              className={inputClass}
              name="excerpt"
              minLength={30}
              maxLength={600}
              rows={3}
              required
            />
          </label>
          <Button type="submit" loading={action.isPending}>
            Check source &amp; add business
          </Button>
        </form>
      </details>
      <section className="space-y-3">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Opportunity filters"
        >
          {(
            [
              ["pending", "Needs review"],
              ["approved", "Approved"],
              ["rejected", "Rejected"],
              ["requests", "Public requests"],
              ["all", "All businesses"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              variant={tab === id ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="block max-w-md text-xs">
          Search loaded opportunities
          <input
            className={inputClass}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Business, city or email"
          />
        </label>
        <p className="text-xs text-[var(--app-text-muted)]">
          Latest {query.data?.limit || 300} opportunities · {rows.length} in
          this view ·{" "}
          {query.data
            ? `Updated ${new Date(query.data.updatedAt).toLocaleTimeString()}`
            : "Loading live data…"}
        </p>
        {query.isPending ? (
          <p>Loading opportunities…</p>
        ) : !query.isError && !rows.length ? (
          <p className="rounded-lg border border-dashed border-[var(--app-border)] p-6 text-sm text-[var(--app-text-muted)]">
            No opportunities in this view. Start discovery or add a public
            business source.
          </p>
        ) : null}
        {rows.map((p) => {
          const emails =
            query.data?.outbox.filter((o) => o.opportunity_id === p.id) || [];
          return (
            <article
              key={p.id}
              className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{p.company_name}</h2>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    {p.category} · {p.city}, {p.country}
                  </p>
                  <p className="mt-1 break-all text-sm">
                    {p.email ||
                      "Published email not found — needs contact review"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={p.source_verified ? "success" : "warning"}>
                    {p.source_verified
                      ? "Source verified"
                      : "Source needs review"}
                  </Badge>
                  <Badge tone="neutral">
                    {p.kind === "business"
                      ? `Potential fit ${p.score}/100`
                      : "Public request — review intent"}
                  </Badge>
                  <Badge tone={p.do_not_contact ? "danger" : "neutral"}>
                    {p.do_not_contact ? "Do not contact" : p.review_status}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-[var(--app-text-muted)]">{p.reason}</p>
              <div className="flex flex-wrap gap-2">
                {p.capabilities.map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-[var(--app-panel-muted)] px-2 py-1 text-xs"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <details>
                <summary className="cursor-pointer text-xs font-medium">
                  Public evidence &amp; suggested solution
                </summary>
                <blockquote className="my-2 border-l-2 border-[var(--app-border)] pl-3 text-sm">
                  {p.excerpt}
                </blockquote>
                <a
                  className="inline-flex items-center gap-1 text-xs text-[var(--app-primary)]"
                  href={p.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open public source
                  <ExternalLink className="size-3" />
                </a>
                {p.signals.map((s, i) => (
                  <p key={i} className="mt-2 text-xs">
                    <strong>{s.label}:</strong> {s.excerpt}
                  </p>
                ))}
                <p className="mt-2 text-xs text-[var(--app-text-muted)]">
                  The proposed system can answer approved product, shipping and delivery
                  questions, use connected order data for updates, qualify sales enquiries,
                  and hand exceptions to staff through a shared dashboard. WhatsApp,
                  Instagram, Facebook and TikTok coverage depends on the client&apos;s
                  authorized accounts and supported integrations.
                </p>
              </details>
              <div className="flex flex-wrap gap-2">
                {p.review_status !== "approved" ? (
                  <Button
                    size="sm"
                    disabled={action.isPending || p.do_not_contact}
                    onClick={() =>
                      action.mutate({ action: "approve", id: p.id })
                    }
                  >
                    Approve opportunity
                  </Button>
                ) : null}
                {p.review_status !== "rejected" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ action: "reject", id: p.id })
                    }
                  >
                    Reject
                  </Button>
                ) : null}
                {p.kind === "business" && p.review_status === "approved" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={
                      action.isPending ||
                      !p.email ||
                      !p.source_verified ||
                      p.do_not_contact
                    }
                    onClick={() =>
                      action.mutate({ action: "prepare", id: p.id })
                    }
                  >
                    Prepare professional email
                  </Button>
                ) : null}
                {!p.do_not_contact ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ action: "stop", id: p.id })}
                  >
                    Stop contact
                  </Button>
                ) : null}
              </div>
              {p.last_reply ? (
                <div className="rounded-lg bg-[var(--app-panel-muted)] p-3 text-sm">
                  <strong>Reply · {p.reply_intent}</strong>
                  <p className="mt-1 whitespace-pre-wrap">{p.last_reply}</p>
                </div>
              ) : null}
              {emails.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--app-border)] p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {o.kind === "initial" ? "First email" : "Meeting reply"} ·{" "}
                      {o.status.replaceAll("_", " ")}
                    </p>
                    <p className="break-words text-xs">{o.subject}</p>
                    {o.sent_at ? (
                      <p className="text-xs text-[var(--app-text-muted)]">
                        Sent {new Date(o.sent_at).toLocaleString()} · Admin
                        notification: {o.notification_status}
                      </p>
                    ) : null}
                    {o.error ? (
                      <p role="alert" className="text-xs text-amber-600">
                        {o.error}
                      </p>
                    ) : null}
                    {o.notification_error ? (
                      <p className="text-xs text-amber-600">
                        {o.notification_error}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditor({ ...o })}
                  >
                    {o.status === "draft" ? "Review email" : "View email"}
                  </Button>
                </div>
              ))}
            </article>
          );
        })}
      </section>
      <section className="rounded-xl border border-[var(--app-border)] p-4">
        <h2 className="font-semibold">Recent discovery jobs</h2>
        {!query.data?.jobs.length ? (
          <p className="mt-2 text-sm text-[var(--app-text-muted)]">
            No jobs recorded.
          </p>
        ) : (
          query.data.jobs.map((j) => (
            <div
              key={j.id}
              className="mt-3 border-t border-[var(--app-border)] pt-3 text-sm"
            >
              <strong>
                {j.category} · {[j.city, j.region, j.country].filter(Boolean).join(", ")}
              </strong>
              <p className="text-xs">
                {j.kind.replaceAll("_", " ")} · {j.status} · {j.result_count}{" "}
                results processed
              </p>
              {j.error ? (
                <p role="alert" className="text-xs text-amber-600">
                  {j.error}
                </p>
              ) : null}
              {j.status === "failed" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate({ action: "retry_search", id: j.id })
                  }
                >
                  Retry discovery
                </Button>
              ) : null}
            </div>
          ))
        )}
      </section>
      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editor?.kind === "booking_reply"
                ? "Meeting reply"
                : "AI agent introduction"}
            </DialogTitle>
            <DialogDescription>
              Review the saved recipient and exact email before approving. This
              sends through workflow 07.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {editor ? (
              <div className="space-y-3">
                <p className="break-all text-sm">
                  To: {editor.email} · {editor.status}
                </p>
                <label className="block text-xs">
                  Subject
                  <input
                    className={inputClass}
                    value={editor.subject}
                    disabled={editor.status !== "draft"}
                    onChange={(e) =>
                      setEditor({ ...editor, subject: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs">
                  Message
                  <textarea
                    className={inputClass}
                    rows={15}
                    value={editor.body}
                    disabled={editor.status !== "draft"}
                    onChange={(e) =>
                      setEditor({ ...editor, body: e.target.value })
                    }
                  />
                </label>
                <p className="text-xs text-[var(--app-text-muted)]">
                  Save edits first, reopen the latest saved draft, then approve.
                  Sending or failed SMTP claims cannot be blindly retried.
                </p>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditor(null)}>
              Close
            </Button>
            {editor?.status === "draft" ? (
              <>
                <Button
                  variant="secondary"
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate(
                      {
                        action: "save",
                        id: editor.id,
                        subject: editor.subject,
                        body: editor.body,
                        expectedUpdatedAt: editor.updated_at,
                      },
                      { onSuccess: () => setEditor(null) },
                    )
                  }
                >
                  Save edits
                </Button>
                <Button
                  disabled={
                    action.isPending ||
                    editor.subject !==
                      query.data?.outbox.find((o) => o.id === editor.id)
                        ?.subject ||
                    editor.body !==
                      query.data?.outbox.find((o) => o.id === editor.id)?.body
                  }
                  onClick={() =>
                    action.mutate(
                      {
                        action: "approve_send",
                        id: editor.id,
                        expectedUpdatedAt: editor.updated_at,
                      },
                      { onSuccess: () => setEditor(null) },
                    )
                  }
                >
                  Approve &amp; queue send
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


