"use client";
import {useState} from "react";
import Link from "next/link";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {apiGet,apiSend} from "@/services/http";
import {Card,CardContent,CardHeader,CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {formatDateTime} from "@/lib/format";
type Rates={audit_usd:number|string|null;contacts_usd:number|string|null;concept_usd:number|string|null};
type Data={updatedAt:string;queue:{queued:number;sending:number;failed:number};notifications:{sent:number;pending:number;failed:number};usage:{audits:number;contacts:number;concepts:number};rates:Rates;estimate:{configured:boolean;estimatedUsd:number|null};notificationEmail:string|null};
function RatesForm({rates}:{rates:Rates}){
 const client=useQueryClient();const [values,setValues]=useState({audit_usd:String(rates.audit_usd??""),contacts_usd:String(rates.contacts_usd??""),concept_usd:String(rates.concept_usd??"")});
 const save=useMutation({mutationFn:()=>apiSend("/api/dashboard/operations","PATCH",Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.trim()===""?null:Number(v)]))),onSuccess:()=>{toast.success("Estimation rates saved");void client.invalidateQueries({queryKey:["operations"]});},onError:(e:Error)=>toast.error(e.message)});
 const labels={audit_usd:"Average USD per audit run",contacts_usd:"Average USD per contact search",concept_usd:"Average USD per complete concept (all image parts)"};
 return <form className="mt-3 space-y-2" onSubmit={e=>{e.preventDefault();save.mutate();}}>{(Object.keys(values) as (keyof Rates)[]).map(key=><label key={key} className="block text-xs">{labels[key]}<Input type="number" step="0.0001" min="0" max="10000" value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})} placeholder="Not set" className="mt-1"/></label>)}<Button size="sm" variant="secondary" type="submit" loading={save.isPending}>Save estimation rates</Button></form>;
}
export function OperationsPanel(){
 const query=useQuery({queryKey:["operations"],queryFn:({signal})=>apiGet<Data>("/api/dashboard/operations",signal),refetchInterval:15000});
 const [edit,setEdit]=useState(false);
 return <Card><CardHeader><CardTitle>Live operations &amp; estimated usage</CardTitle></CardHeader><CardContent>
  {query.isPending?<p className="text-xs">Reading live database…</p>:query.isError?<div className="text-xs"><p role="alert">{query.error.message}</p><Button variant="secondary" size="sm" onClick={()=>void query.refetch()}>Refresh</Button></div>:query.data?<div className="space-y-3 text-xs">
   <p className="text-[var(--app-text-muted)]">Database totals · updated {formatDateTime(query.data.updatedAt)}</p>
   <div className="grid gap-4 sm:grid-cols-3"><div><p className="font-semibold">Outreach</p><p>{query.data.queue.queued} queued · {query.data.queue.sending} sending</p><Link href="/dashboard/outreach" className="underline">{query.data.queue.failed} leads need attention</Link></div>
   <div><p className="font-semibold">Admin notifications</p><p>{query.data.notifications.sent} sent · {query.data.notifications.pending} pending · {query.data.notifications.failed} failed/skipped</p><p className="break-all">{query.data.notificationEmail||"Recipient not configured"}</p></div>
   <div><p className="font-semibold">Estimated cost (USD)</p><p>{query.data.estimate.estimatedUsd===null?"Set your average unit costs":`$${query.data.estimate.estimatedUsd.toFixed(2)}`}</p><p>{query.data.usage.audits} audit runs · {query.data.usage.contacts} contact searches · {query.data.usage.concepts} concept jobs started</p></div></div>
   <p className="text-[var(--app-text-muted)]">Estimate only, using your average cost per started job. Failed jobs may also use credits. Multiple image parts are included in your per-concept average. This is not a provider billing total.</p>
   <Button variant="ghost" size="sm" onClick={()=>setEdit(!edit)}>{edit?"Hide rates":"Configure estimation rates"}</Button>
   {edit?<RatesForm key={JSON.stringify(query.data.rates)} rates={query.data.rates}/>:null}
  </div>:null}
 </CardContent></Card>;
}
