"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { stages, type Stage } from "@/lib/apply-today";

const labels = { shortlisted: "Shortlisted", ready: "Ready to apply", applied: "Applied", reply: "Replies", call: "Calls", paid: "Paid", rejected: "Rejected" };
type Draft = { stage: Stage; requirement: string; fit: string; portfolio_url: string; proposal: string };
type Project = { id: string; title: string; sourceUrl: string | null; application: Draft | null };
const empty: Draft = {stage: "shortlisted", requirement: "", fit: "", portfolio_url: "", proposal: ""};
const panel = "rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-panel)] p-4";
const input = "w-full rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-2 text-sm";
const muted = "text-sm text-[var(--app-text-muted)]";

async function readResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export default function ApplyToday() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [tab, setTab] = useState<Stage | "new">("new");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Project | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/apply-today", { cache: "no-store", signal: controller.signal })
      .then(readResponse)
      .then(data => setProjects(data.projects))
      .catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);

  function open(project: Project) {
    setSelected(project);
    setDraft(project.application ?? empty);
    setNotice("");
    setError("");
  }

  async function prepare() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await readResponse(await fetch("/api/apply-today", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({action:"prepare", candidate_id:selected.id}),
      }));
      if (data.state === "draft_ready") {
        setDraft(current => ({...current, ...data.draft}));
        setNotice("Draft prepared. Verify eligibility, budget and Connects before applying, then save your draft.");
      } else setNotice(data.reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare the proposal.");
    } finally { setBusy(false); }
  }

  async function save(stage: Stage) {
    if (!selected) return;
    setBusy(true);
    setNotice("");
    setError("");
    const { requirement, fit, portfolio_url, proposal } = draft;
    try {
      const data = await readResponse(await fetch("/api/apply-today", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ candidate_id: selected.id, stage, requirement, fit, portfolio_url, proposal }),
      }));
      const updated = {...selected, application: data.application as Draft};
      setProjects(previous => previous?.map(row => row.id === selected.id ? updated : row) ?? null);
      setSelected(updated);
      setDraft(data.application);
      setTab(stage);
      if (stage === "rejected") setSelected(null);
      setNotice("Application saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save application.");
    } finally { setBusy(false); }
  }

  const rows = (projects ?? []).filter(row =>
    (tab === "new" ? !row.application : row.application?.stage === tab) &&
    row.title.toLowerCase().includes(search.trim().toLowerCase()));
  const field = (key: keyof Omit<Draft, "stage">, value: string) => setDraft(current => ({ ...current, [key]: value }));

  return <section className="space-y-5 text-[var(--app-text)]">
    <header><h1 className="text-2xl font-semibold">Apply Today</h1>
      <p className={muted}>Review discovered projects, prepare proposals and track applications separately from email outreach.</p>
    </header>
    {error && <p role="alert" className={panel}>{error}</p>}
    {notice && <p role="status" className={muted}>{notice}</p>}
    {selected ? <>
      <Button variant="secondary" disabled={busy} onClick={() => {setSelected(null); setNotice(""); setError("");}}>Back to queue</Button>
      <h2 className="text-xl font-semibold break-words">{selected.title}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={panel + " space-y-4"}>
          <h3 className="font-semibold">Project details</h3>
          <p className={muted}>Job Platforms · Verify the post is still open before applying.</p>
          {selected.sourceUrl ? <Button asChild variant="secondary"><a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">Open original post</a></Button> : <p className={muted}>No valid original post link is available.</p>}
          <label className="block space-y-1"><span>Client requirement</span><textarea className={input} rows={3} maxLength={1500} value={draft.requirement} onChange={e => field("requirement", e.target.value)} /></label>
          <label className="block space-y-1"><span>Why it fits</span><textarea className={input} rows={3} maxLength={1500} value={draft.fit} onChange={e => field("fit", e.target.value)} /></label>
          <label className="block space-y-1"><span>Matching portfolio URL</span><input className={input} type="url" maxLength={2048} value={draft.portfolio_url} onChange={e => field("portfolio_url", e.target.value)} /></label>
        </div>
        <div className={panel + " space-y-4"}>
          <label className="block space-y-1"><span className="font-semibold">Proposal draft</span><textarea className={input} rows={12} maxLength={6000} value={draft.proposal} onChange={e => field("proposal", e.target.value)} /></label>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy || !selected.sourceUrl || !!(draft.proposal.trim() || draft.requirement.trim() || draft.fit.trim())} onClick={() => void prepare()}>Prepare proposal</Button>
            <Button variant="secondary" disabled={!draft.requirement.trim() || !!draft.proposal.trim()} onClick={() => field("proposal", ["Hi,", "I can help with the following: " + draft.requirement.trim(), draft.fit.trim(), draft.portfolio_url ? "Relevant sample: " + draft.portfolio_url : "", "Would you be open to discussing the scope and timeline?"].filter(Boolean).join("\n\n"))}>Start draft</Button>
            <Button variant="secondary" disabled={!draft.proposal.trim()} onClick={async () => {
              try { await navigator.clipboard.writeText(draft.proposal); setNotice("Proposal copied."); }
              catch { setError("Could not copy. Select and copy the draft manually."); }
            }}>Copy proposal</Button>
          </div>
          <p className={muted}>Apply on the original platform. Saving a status does not send a proposal or email.</p>
          <label className="block space-y-1"><span>Application stage</span><select className={input} value={draft.stage} onChange={e => setDraft({...draft, stage: e.target.value as Stage})}>
            {stages.filter(stage => stage !== "rejected" || draft.stage === "rejected").map(stage => <option key={stage} value={stage}>{labels[stage]}</option>)}
          </select></label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !selected.sourceUrl || draft.stage === "rejected"} onClick={() => void save(draft.stage)}>{draft.stage === "applied" ? "Mark as applied" : "Save application"}</Button>
            {(!selected.application || ["shortlisted", "ready"].includes(selected.application.stage)) && <Button variant="danger" disabled={busy} onClick={() => void save("rejected")}>Reject project</Button>}
            {selected.application?.stage === "rejected" && <Button variant="secondary" disabled={busy || !selected.sourceUrl} onClick={() => void save("shortlisted")}>Restore to shortlist</Button>}
          </div>
        </div>
      </div>
    </> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">{stages.map(stage => <div key={stage} className={panel}><p className={muted}>{labels[stage]}</p><p className="text-xl font-semibold">{projects ? projects.filter(row => row.application?.stage === stage).length : "—"}</p></div>)}</div>
      <div className="flex flex-wrap gap-2" aria-label="Application filters">
        <Button variant={tab === "new" ? "primary" : "secondary"} aria-pressed={tab === "new"} onClick={() => setTab("new")}>New projects</Button>
        {stages.map(stage => <Button key={stage} variant={tab === stage ? "primary" : "secondary"} aria-pressed={tab === stage} onClick={() => setTab(stage)}>{labels[stage]}</Button>)}
      </div>
      <label className="block max-w-md space-y-1"><span className={muted}>Search projects</span><input className={input} value={search} onChange={e => setSearch(e.target.value)} /></label>
      <div className={panel + " divide-y divide-[var(--app-border)]"}>
        {!projects ? (!error && <p role="status">Loading projects…</p>) : !rows.length ? <p className={muted}>No projects in this view.</p> : rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1"><p className="font-medium break-words">{row.title}</p><p className={muted}>{row.application?.fit || "Job Platforms"}</p></div>
          <Button size="sm" variant="secondary" onClick={() => open(row)}>Review</Button>
        </div>)}
      </div>
    </>}
  </section>;
}
