"use client";

import { Bot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentStatus } from "@/hooks/use-lead-data";
import { formatDateTime } from "@/lib/format";

const TONE = {
  online: "success",
  degraded: "warning",
  offline: "danger",
} as const;

const LABEL = {
  online: "Agents online",
  degraded: "Demo mode",
  offline: "Agents offline",
} as const;

/** Compact connection indicator for the Opportunity Hunter and Outreach agents. */
export function AgentStatusIndicator() {
  const { data, isPending, isError } = useAgentStatus();

  if (isPending) {
    return <span className="skeleton hidden h-6 w-28 rounded-full sm:block" />;
  }

  if (isError || !data) {
    return (
      <Badge tone="danger">
        <Bot className="size-3" aria-hidden />
        Status unavailable
      </Badge>
    );
  }

  const worst =
    data.opportunityHunter === "offline" || data.outreachAgent === "offline"
      ? "offline"
      : data.opportunityHunter === "degraded" || data.outreachAgent === "degraded"
        ? "degraded"
        : "online";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="rounded-full focus-visible:outline-2">
          <Badge tone={TONE[worst]}>
            <Bot className="size-3" aria-hidden />
            {LABEL[worst]}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="block">Opportunity Hunter: {data.opportunityHunter}</span>
        <span className="block">Outreach Agent: {data.outreachAgent}</span>
        <span className="mt-1 block opacity-80">Checked {formatDateTime(data.checkedAt)}</span>
      </TooltipContent>
    </Tooltip>
  );
}
