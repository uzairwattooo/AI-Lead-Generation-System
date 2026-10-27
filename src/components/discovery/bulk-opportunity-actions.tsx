"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/services/http";
import { bulkBlockReason, MAX_BULK_OPPORTUNITIES, runOpportunityBatch, type BulkAction, type BulkOpportunity, type BulkResponse, type BulkResult } from "@/lib/automation/bulk-opportunities";

type Props = {
  rows: readonly BulkOpportunity[]; selectedIds: readonly string[]; disabled: boolean;
  onSelect: (ids: string[]) => void; onBusyChange: (busy: boolean) => void; onRefresh: () => void;
};
export function BulkOpportunityActions({rows, selectedIds, disabled, onSelect, onBusyChange, onRefresh}: Props) {
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [current, setCurrent] = useState("");
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<BulkResult[]>([]);
  const stop = useRef(false);
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stop.current = true; }; }, []);
  const selected = rows.filter(p => selectedIds.includes(p.id));
  const selectable = rows.filter(p => p.kind === "business" && !p.do_not_contact && ["pending","approved"].includes(p.review_status));
  const canRecheck = selected.filter(p => !bulkBlockReason(p,"recheck_source")).length;
  const canApprove = selected.filter(p => !bulkBlockReason(p,"approve_verified")).length;
  async function start(action: BulkAction) {
    if (active.current || disabled || !selected.length) return;
    active.current = true;
    stop.current = false;
    const snapshot = [...selected];
    setRunning(true); setStopping(false); setResults([]); setTotal(snapshot.length); onBusyChange(true);
    try {
      await runOpportunityBatch({
        rows:snapshot, action, shouldStop:()=>stop.current,
        execute:(id,operation)=>apiSend<BulkResponse>("/api/automation","POST",{id,action:operation}),
        onStart:p=>{if(mounted.current)setCurrent(p.company_name);},
        onResult:result=>{
          if(mounted.current) {setResults(previous=>[...previous,result]);onRefresh();}
        },
      });
    } finally {
      active.current = false;
      if(mounted.current) {setRunning(false);setCurrent("");onBusyChange(false);onRefresh();}
    }
  }
  return (
    <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{selected.length} selected</span>
        <Button size="sm" variant="secondary" disabled={disabled || running || !selectable.length}
          onClick={()=>onSelect(selectable.slice(0,MAX_BULK_OPPORTUNITIES).map(p=>p.id))}>Select this view (up to {MAX_BULK_OPPORTUNITIES})</Button>
        <Button size="sm" variant="ghost" disabled={disabled || running || !selectedIds.length} onClick={()=>onSelect([])}>Clear selection</Button>
        <Button size="sm" variant="secondary" disabled={disabled || running || !canRecheck} onClick={()=>void start("recheck_source")}>Recheck selected ({canRecheck})</Button>
        <Button size="sm" disabled={disabled || running || !canApprove} onClick={()=>void start("approve_verified")}>Approve verified selected ({canApprove})</Button>
        {running ? <Button size="sm" variant="secondary" disabled={stopping} onClick={()=>{stop.current=true;setStopping(true);}}>Stop after current</Button> : null}
      </div>
      <p className="text-xs text-[var(--app-text-muted)]">Review the selected businesses first. Bulk approval requires a verified source, published email and opportunity evidence. Rechecks use official website pages. Keep this page open while the batch runs. Email drafts and sending are reviewed separately.</p>
      {total > 0 ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="break-words text-sm">{running ? stopping ? "Stopping after the current request…" : `Processing ${current}…` : results.length < total ? "Batch stopped. Remaining businesses were not processed." : "Batch complete."} {results.length}/{total} checked.</p>
          <progress aria-label="Selected businesses processed" className="h-2 w-full" max={total} value={results.length} />
          <p className="text-xs">{results.filter(r=>r.status==="success").length} completed · {results.filter(r=>r.status==="review").length} need review · {results.filter(r=>r.status==="skipped").length} skipped · {results.filter(r=>r.status==="failed").length} failed</p>
        </div>
      ) : null}
      {results.length ? <details className="text-sm" open={!running}>
        <summary className="cursor-pointer">Results for each business ({results.length})</summary>
        <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
          {results.map(r=><li key={r.id} className="break-words"><strong>{r.name}</strong> · {r.status}<p className="text-xs text-[var(--app-text-muted)]">{r.message}</p></li>)}
        </ul>
      </details> : null}
    </div>
  );
}
