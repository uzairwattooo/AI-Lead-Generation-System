"use client";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {ActivityList} from "@/components/activity-list";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {apiGet,apiSend} from "@/services/http";
import type {ActivityEvent} from "@/types";
import type {RetryOption,RetryKind} from "@/server/operations/policy";
type Diagnostics={timeline:ActivityEvent[];retries:RetryOption[];outreachStatus:string;auditStatus:string;lastError:string|null;notification:{status:string;error:string|null;sentAt:string|null;configuredRecipient:string|null};trackingNote:string};
export function LeadOperations({leadId}:{leadId:string}){
 const client=useQueryClient();
 const query=useQuery({queryKey:["lead-operations",leadId],queryFn:({signal})=>apiGet<Diagnostics>(`/api/leads/${leadId}/diagnostics`,signal),refetchInterval:10000});
 const retry=useMutation({mutationFn:(kind:RetryKind)=>apiSend<{dispatch?:{detail?:string};detail?:string;blockReason?:string}>(`/api/leads/${leadId}/retry`,"POST",{kind}),onSuccess:r=>{toast.success("Request saved",{description:r.dispatch?.detail||r.detail||r.blockReason||"Check the latest status below."});for(const key of ["lead-operations","leads","outreach","overview","operations","activity"])void client.invalidateQueries({queryKey:[key]});},onError:(e:Error)=>{toast.error("Retry did not complete",{description:e.message});void query.refetch();}});
 return <section className="space-y-3 rounded-lg border border-[var(--app-border)] p-3">
  <h3 className="text-sm font-semibold">Processing &amp; history</h3>
  {query.isPending?<p className="text-xs">Loading current status…</p>:query.isError?<div className="text-xs"><p role="alert">{query.error.message}</p><Button size="sm" variant="secondary" onClick={()=>void query.refetch()}>Refresh</Button></div>:query.data?<>
   <div className="flex flex-wrap gap-2"><Badge tone={query.data.auditStatus.includes("failed")?"danger":query.data.auditStatus==="audit_completed"?"success":"neutral"}>Audit: {query.data.auditStatus.replaceAll("_"," ")}</Badge><Badge tone={query.data.lastError||["failed","blocked"].includes(query.data.outreachStatus)?"danger":query.data.outreachStatus==="sending"?"info":query.data.outreachStatus==="sent"?"success":"neutral"}>Outreach: {query.data.outreachStatus.replaceAll("_"," ")}</Badge></div>
   {/^follow_up_generation_attempt=\d+;/.test(query.data.lastError||"") ? <p className="text-xs text-[var(--app-text-muted)]">This error is in follow-up generation. Initial-send retry buttons remain blocked to prevent sending the first email twice. After fixing the reported cause, use Retry failed follow-up below. It checks the send history before scheduling.</p> : null}
   {query.data.lastError?<p role="alert" className="break-words text-xs text-amber-600">{query.data.lastError}</p>:null}
   <p className="text-[11px] text-[var(--app-text-muted)]">Retries recheck the current database state. Failed follow-up retries resume workflow 04 and preserve the earlier sent email. Generating a new concept uses image credits.</p>
   <div className="flex flex-wrap gap-2">{query.data.retries.map(option=><div key={option.kind} className="max-w-full"><Button size="sm" variant="secondary" disabled={!option.allowed||retry.isPending} loading={retry.isPending&&retry.variables===option.kind} title={option.reason||undefined} onClick={()=>retry.mutate(option.kind)}>{option.label}</Button>{option.reason?<p className="mt-1 max-w-64 text-[11px] text-[var(--app-text-muted)]">{option.reason}</p>:null}</div>)}</div>
   <div className="space-y-1 text-xs"><p>Admin notification: <strong>{query.data.notification.status.replaceAll("_"," ")}</strong></p><p className="break-all text-[var(--app-text-muted)]">Configured recipient: {query.data.notification.configuredRecipient||"Not configured"}</p>{query.data.notification.error?<p role="alert" className="text-amber-600">{query.data.notification.error}</p>:null}</div>
   <p className="text-[11px] text-[var(--app-text-muted)]">{query.data.trackingNote}</p>
   <details><summary className="cursor-pointer text-xs font-medium">Activity timeline ({query.data.timeline.length})</summary><ActivityList events={query.data.timeline} emptyTitle="No recorded history" emptyDescription="New state changes will appear here."/></details>
  </>:null}
 </section>;
}

