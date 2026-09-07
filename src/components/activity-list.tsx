import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/states";
import type { ActivityEvent } from "@/types";

const ACTOR_LABELS: Record<ActivityEvent["actor"], string> = {
  opportunity_hunter: "Opportunity Hunter",
  outreach_agent: "Outreach Agent",
  system: "System",
  user: "Team member",
};

const ICONS: Record<ActivityEvent["severity"], typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: CircleAlert,
};

const ICON_COLORS: Record<ActivityEvent["severity"], string> = {
  info: "text-cobalt-600",
  success: "text-teal-600",
  warning: "text-amber-warn-600",
  error: "text-danger-600",
};

export function ActivityList({
  events,
  emptyTitle = "No agent activity yet",
  emptyDescription = "Activity will appear here once the Opportunity Hunter Agent runs.",
}: {
  events: ActivityEvent[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (events.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ol className="divide-y divide-[var(--app-border)]">
      {events.map((event) => {
        const Icon = ICONS[event.severity];
        return (
          <li key={event.id} className="flex gap-3 px-4 py-3 sm:px-5">
            <Icon className={`mt-0.5 size-4 shrink-0 ${ICON_COLORS[event.severity]}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--app-text)]">{event.message}</p>
              <p className="mt-0.5 text-[11px] text-[var(--app-text-subtle)]">
                {ACTOR_LABELS[event.actor]} · {formatDateTime(event.createdAt)}
                {event.requestId ? ` · ${event.requestId}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
