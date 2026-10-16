"use client";
import Image from "next/image";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search,ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet,apiSend } from "@/services/http";
import { errorMessage } from "@/hooks/use-lead-data";
import { conceptBlockedReason } from "@/lib/lead-tools-availability";
import type { Lead } from "@/types";
type Contact={name:string;role:string;email:string;phone:string;sourceUrl:string;confirmed:boolean};
type Job={id:string;kind:string;status:string;error_message:string|null;result?:{candidates?:Contact[];summary?:string}};
export function LeadToolsPanel({lead}:{lead:Lead}) {
 const client=useQueryClient();const path=`/api/leads/${lead.id}/tools`;
 const jobs=useQuery({queryKey:["lead-tools",lead.id],queryFn:({signal})=>apiGet<Job[]>(path,signal),refetchInterval:query=>query.state.data?.some(j=>["queued","processing"].includes(j.status))?5000:false});
 const refresh=()=>{void client.invalidateQueries({queryKey:["lead-tools",lead.id]});void client.invalidateQueries({queryKey:["leads"]});void client.invalidateQueries({queryKey:["outreach"]});};
 const start=useMutation({mutationFn:(kind:string)=>apiSend(path,"POST",{kind}),onSuccess:()=>{toast.success("Task started");refresh();},onError:e=>toast.error(errorMessage(e))});
 const apply=useMutation({mutationFn:(input:{jobId:string;index:number})=>apiSend(path,"PATCH",input),onSuccess:()=>{toast.success("Public contact saved; email deliverability is not yet verified");refresh();},onError:e=>toast.error(errorMessage(e))});
 const prepare=useMutation({mutationFn:()=>apiSend(`/api/leads/${lead.id}/concept-email`,"POST"),onSuccess:()=>{toast.success("Concept email ready for your approval");refresh();},onError:e=>toast.error(errorMessage(e))});
 const latestContacts=jobs.data?.find(j=>j.kind==="contacts");const latestConcept=jobs.data?.find(j=>j.kind==="concept");
 const active=(kind:string)=>jobs.data?.some(j=>j.kind===kind&&["queued","processing"].includes(j.status));
 const conceptReason=conceptBlockedReason(lead,Boolean(active("concept")));
 return <section className="my-4 space-y-3 rounded-lg border border-[var(--app-border)] p-3">
  <h3 className="text-sm font-semibold">Contact research &amp; homepage concept</h3>
  <div className="flex flex-wrap gap-2">
   <Button size="sm" variant="secondary" loading={start.isPending&&start.variables==="contacts"} disabled={active("contacts")} onClick={()=>start.mutate("contacts")}><Search aria-hidden />Find public contacts</Button>
   <Button size="sm" variant="secondary" loading={start.isPending&&start.variables==="concept"} disabled={Boolean(conceptReason)} title={conceptReason||undefined} aria-describedby={conceptReason?`concept-reason-${lead.id}`:undefined} onClick={()=>start.mutate("concept")}><ImagePlus aria-hidden />Capture &amp; redesign homepage</Button>
  </div>
  {conceptReason?<p id={`concept-reason-${lead.id}`} className="text-xs text-[var(--app-text-muted)]">Homepage concept: {conceptReason}</p>:null}
  {active("contacts")?<p role="status" className="text-xs">Searching public sources. Results normally appear within one minute.</p>:null}
  <p className="text-xs text-[var(--app-text-muted)]">Searches public LinkedIn and business sources. Missing results stay for manual review. AI creates a full-page visual proposal; long pages take longer and use more image-generation credits. Review the design before attaching it to an email.</p>
  {jobs.isError?<p role="alert" className="text-xs">{errorMessage(jobs.error)}</p>:null}
  {[latestContacts,latestConcept].filter((j):j is Job=>Boolean(j)).map(job=><div key={job.id} className="space-y-2 text-xs"><Badge tone={job.status==="failed"?"danger":job.status==="completed"?"success":"info"}>{job.kind==="contacts"?"Contact search":"Homepage concept"}: {job.status.replaceAll("_"," ")}</Badge>{job.error_message?<p>{job.error_message}</p>:null}{job.result?.summary?<p>{job.result.summary}</p>:null}
   {job.result?.candidates?.map((c,index)=><div key={`${c.sourceUrl}-${index}`} className="rounded border border-[var(--app-border)] p-2"><p className="font-medium">{c.name||"Business contact"}{c.role?` · ${c.role}`:""}</p><p className="break-all">{c.email||"No public email"} · {c.phone||"No public phone"}</p><a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--app-primary)] underline">View public source</a><p className="my-1">{c.confirmed?"Contact confirmed on source; deliverability not checked":"Source could not be independently confirmed; manual review required"}</p>{c.confirmed?<Button size="sm" variant="secondary" loading={apply.isPending} onClick={()=>apply.mutate({jobId:job.id,index})}>Apply missing contact details</Button>:null}</div>)}
  </div>)}
  {lead.visualConceptReady?<div className="space-y-2"><a target="_blank" rel="noopener noreferrer" href={`/api/leads/${lead.id}/concept`}><Image unoptimized src={`/api/leads/${lead.id}/concept?version=${latestConcept?.id||"current"}`} alt="Current homepage beside the proposed AI design concept" width={1552} height={1716} className="max-h-96 w-full rounded border border-[var(--app-border)] object-contain" /></a><div className="flex flex-wrap gap-2"><a className="text-xs underline" target="_blank" rel="noopener noreferrer" href={`/api/leads/${lead.id}/concept?kind=before`}>Full original screenshot</a><a className="text-xs underline" target="_blank" rel="noopener noreferrer" href={`/api/leads/${lead.id}/concept?kind=after`}>Full proposed homepage</a></div><Button size="sm" loading={prepare.isPending} onClick={()=>prepare.mutate()}>Prepare email with this image</Button><p className="text-xs">The before/after PNG is attached only after you approve this email.</p></div>:null}
  {lead.outreachIncludeConcept?<p className="text-xs font-medium">Email includes the reviewed homepage concept image.</p>:null}
  {lead.adminNotificationStatus?<p className="text-xs">Admin notification: {lead.adminNotificationStatus}{lead.adminNotificationError?` · ${lead.adminNotificationError}`:""}</p>:null}
 </section>;
}
