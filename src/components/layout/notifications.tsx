"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CircleAlert, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActivity } from "@/hooks/use-lead-data";
import { formatDateTime } from "@/lib/format";

const ICONS = {
  error: CircleAlert,
  warning: AlertTriangle,
  info: Info,
  success: Info,
} as const;

/** Surfaces warning and error activity events that need a person's attention. */
export function NotificationsMenu() {
  const { data, isPending } = useActivity(50);
  const alerts = (data ?? []).filter(
    (event) => event.severity === "warning" || event.severity === "error",
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={
            alerts.length > 0 ? `Notifications, ${alerts.length} needing review` : "Notifications"
          }
        >
          <Bell aria-hidden />
          {alerts.length > 0 ? (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-amber-warn-600 ring-2 ring-[var(--app-panel)]" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Needs review</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isPending ? (
          <div className="space-y-2 p-2">
            <span className="skeleton block h-10 rounded-md" />
            <span className="skeleton block h-10 rounded-md" />
          </div>
        ) : alerts.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-[var(--app-text-muted)]">
            Nothing needs your attention right now.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {alerts.slice(0, 8).map((event) => {
              const Icon = ICONS[event.severity];
              return (
                <li key={event.id} className="border-b border-[var(--app-border)] last:border-0">
                  <div className="flex gap-2 px-2 py-2.5">
                    <Icon
                      className={
                        event.severity === "error"
                          ? "mt-0.5 size-4 shrink-0 text-danger-600"
                          : "mt-0.5 size-4 shrink-0 text-amber-warn-600"
                      }
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--app-text)]">{event.message}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--app-text-subtle)]">
                        {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <DropdownMenuSeparator />
        <div className="p-1">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link href="/dashboard/activity">View all activity</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
