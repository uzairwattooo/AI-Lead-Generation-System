"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/http";
import type { DiscoveryJob } from "@/lib/automation/discovery-progress";

export function AutomationJobSummary({ job }: { job: DiscoveryJob }) {
  const terminal = ["completed", "failed"].includes(job.status);
  const legacy = terminal && !job.run_id;
  const stage = terminal ? job.status : job.stage || job.status;
  const percent = job.status === "completed" ? 100 : Math.max(0, Math.min(100, job.progress_percent || 0));
  const stages = ["queued", "searching", "reviewing", "completed"];
  const current = stages.indexOf(job.status === "failed" ? job.stage || "queued" : stage);
  return <div className="space-y-3">
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <strong>{job.category} · {[job.city, job.region, job.country].filter(Boolean).join(", ")}</strong>
      <span role="status">{stage.replaceAll("_", " ")} · {percent}%</span>
    </div>
    <progress aria-label="AI discovery job progress" max={100} value={percent} className="h-2 w-full accent-teal-500" />
    <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label="Discovery stages">
      {stages.map((step,index) => <li key={step} aria-current={step === stage ? "step" : undefined} className={index <= current ? "font-medium text-[var(--app-text)]" : "text-[var(--app-text-muted)]"}>
        {index+1}. {step === "reviewing" ? "Check sources & save" : step === "completed" ? "Results ready" : step === "searching" ? "Search public sources" : "Waiting for workflow 06"}
      </li>)}
    </ol>
    <p className="text-xs text-[var(--app-text-muted)]">
      Found {job.found_count ?? "—"} · Checked {job.processed_count ?? "—"} · Saved {job.result_count}
      {" · "}Verified with contact {job.verified_count ?? "—"} · Needs review {job.review_count ?? "—"} · Duplicates {job.duplicate_count ?? "—"}
    </p>
    {job.status === "queued" ? <p className="text-xs">Waiting for the next scheduled run of workflow 06. No email is sent by discovery.</p> : null}
    {job.status === "completed" && !job.result_count ? <p className="text-sm">{job.run_id && job.found_count === 0 ? "Search returned no business candidates. No leads or contacts were invented." : "No new opportunities saved. Result details distinguish duplicates, invalid fields and source/save failures."}</p> : null}
    {job.error ? <p role="alert" className="break-words text-xs text-amber-600">{job.error}</p> : null}
    {job.status === "failed" && job.run_id ? <p className="text-xs">Stopped during: {(job.stage || "discovery").replaceAll("_", " ")}. Previously saved results remain available.</p> : null}
    {job.diagnostics?.length ? <details open={job.status === "failed" || !job.result_count}>
      <summary className="cursor-pointer text-xs font-medium">Result details ({job.diagnostics.length})</summary>
      <ul className="mt-2 space-y-2">{job.diagnostics.map((row,index) => <li key={`${index}-${row.name}`} className="rounded-md border border-[var(--app-border)] p-2 text-xs">
        <strong>{row.name} · {row.outcome.replaceAll("_", " ")}</strong>
        <p className="mt-1 break-words">{row.reason}</p>
        {row.sourceUrl?.startsWith("https://") ? <a className="mt-1 inline-block underline" href={row.sourceUrl} target="_blank" rel="noopener noreferrer">Open public source</a> : null}
      </li>)}</ul>
    </details> : terminal && legacy ? <p className="text-xs text-[var(--app-text-muted)]">This older run did not record per-result reasons. Start a new discovery to get detailed progress; earlier discarded results cannot be reconstructed from this log.</p> : null}
    {job.result_count > 0 ? <p className="text-xs"><Link className="underline" href="/dashboard/automation">View saved businesses in Needs review</Link>. Unverified contacts remain blocked from outreach.</p> : null}
  </div>;
}

export function AutomationJobProgress({ jobId }: { jobId: string }) {
  const query = useQuery({
    queryKey: ["automation-discovery-job",jobId],
    queryFn: ({signal}) => apiGet<DiscoveryJob>(`/api/automation/jobs/${jobId}`,signal),
    refetchInterval: query => query.state.data && ["completed","failed"].includes(query.state.data.status) ? false : 3000,
  });
  return <section className="rounded-xl border border-[var(--app-border)] p-4" aria-label="AI discovery live progress">
    {query.isPending ? <p role="status" className="text-sm">Loading discovery progress…</p> : query.isError ? <div><p role="alert" className="text-sm">{query.error.message}</p><button type="button" className="mt-2 underline" onClick={() => void query.refetch()}>Retry progress refresh</button></div> : query.data ? <AutomationJobSummary job={query.data} /> : null}
  </section>;
}
