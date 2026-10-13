import { LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { leadProgress } from "@/lib/leads/progress";
import type { Lead } from "@/types";

export function LeadProgressBadge({ lead }: { lead: Lead }) {
  const progress = leadProgress(lead);
  return <Badge tone={progress.tone} className="max-w-64 whitespace-normal" role="status">
    {progress.active ? <LoaderCircle className="size-3 shrink-0 motion-safe:animate-spin" aria-hidden /> : null}
    {progress.label}
  </Badge>;
}
