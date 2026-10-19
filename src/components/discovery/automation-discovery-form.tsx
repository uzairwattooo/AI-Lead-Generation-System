"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { apiSend } from "@/services/http";
import { LocationFields } from "./location-fields";
const style = "mt-1 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-sm text-[var(--app-text)]";
export function AutomationDiscoveryForm() {
  const client = useQueryClient();
  const [location, setLocation] = useState({ country: "United States", region: "", city: "" });
  const [category, setCategory] = useState("All business categories");
  const [custom, setCustom] = useState("");
  const search = useMutation({
    mutationFn: (input: Record<string, unknown>) => apiSend("/api/automation", "POST", { action: "search", input }),
    onSuccess: () => { toast.success("AI opportunity discovery queued", { description: "Review results in AI Automation Opportunities." }); void client.invalidateQueries({ queryKey: ["automation-opportunities"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault(); if (search.isPending) return;
    const form = new FormData(event.currentTarget);
    search.mutate({ ...location, category: category === "__custom" ? custom : category, kind: form.get("kind"), limit: Number(form.get("limit")) });
  }}>
    <label className="block text-xs">Business category<select className={style} value={category} disabled={search.isPending} onChange={e => setCategory(e.target.value)}>
      <option>All business categories</option>{BUSINESS_CATEGORIES.map(c => <option key={c}>{c}</option>)}<option value="__custom">Other business category</option>
    </select></label>
    {category === "__custom" ? <label className="block text-xs">Enter category<input className={style} value={custom} onChange={e => setCustom(e.target.value)} required minLength={2} maxLength={100} disabled={search.isPending} /></label> : null}
    <LocationFields value={location} onChange={setLocation} disabled={search.isPending} />
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Search type<select name="kind" className={style} disabled={search.isPending}><option value="business">Businesses for AI agents</option><option value="buyer_request">Public buying requests</option></select></label>
    <label className="text-xs">Results (1–10)<input name="limit" type="number" className={style} defaultValue={5} min={1} max={10} required disabled={search.isPending} /></label></div>
    <p className="text-xs text-[var(--app-text-muted)]">Find potential fits for enquiry replies, lead qualification, bookings and a business dashboard. Public evidence is checked; message volume and purchase intent are not confirmed. Search uses OpenAI credits and needs workflow 06 active.</p>
    <Button type="submit" loading={search.isPending}>Find AI opportunities</Button>
    {search.isError ? <p role="alert" className="text-sm text-red-400">{search.error.message}</p> : null}
    {search.isSuccess ? <p role="status" className="text-sm">Search queued. <Link className="underline" href="/dashboard/automation">View discovery progress and review results</Link></p> : null}
    <p className="text-xs text-[var(--app-text-muted)]">City and state matching uses public location evidence, not GPS radius tracking. Private inboxes and groups are not searched. Discovery never sends email; approve the business and its draft first.</p>
  </form>;
}
