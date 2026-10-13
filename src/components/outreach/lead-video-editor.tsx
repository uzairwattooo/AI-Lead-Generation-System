"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiSend } from "@/services/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LeadVideoEditor({ leadId, videoUrl }: { leadId: string | null; videoUrl?: string | null }) {
  const [value, setValue] = useState(videoUrl || "");
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () => apiSend(`/api/leads/${leadId}/video`, "PATCH", { videoUrl: value }),
    onSuccess: () => {
      toast.success("Video link saved");
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => toast.error("Could not save video", { description: error.message }),
  });
  return <section className="mb-4 rounded-md border border-[var(--app-border)] p-3">
    <label htmlFor={`lead-video-${leadId}`} className="text-xs font-semibold">2-minute video walkthrough</label>
    <p className="mb-2 mt-1 text-xs text-[var(--app-text-muted)]">Add this business&apos;s recorded video link. It is shared only when requested. The first email has no attachment.</p>
    {leadId ? <form className="flex flex-col gap-2 sm:flex-row" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <Input id={`lead-video-${leadId}`} type="url" value={value} onChange={event => setValue(event.target.value)} placeholder="https://…" className="min-w-0 flex-1" />
      <Button size="sm" type="submit" loading={save.isPending}>Save video link</Button>
    </form> : <p className="text-xs text-[var(--app-text-muted)]">Prepare this approved lead for outreach to add its video.</p>}
  </section>;
}
