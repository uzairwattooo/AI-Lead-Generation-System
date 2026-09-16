import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface Metric {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "neutral" | "primary" | "success" | "warning";
  hint?: string;
}

/**
 * Saturated gradient chips behind each icon. A figure with a solid colour chip
 * beside it reads as a deliberate instrument; a pale wash reads as unfinished.
 */
const TONE_CHIP: Record<NonNullable<Metric["tone"]>, string> = {
  neutral: "bg-linear-to-br from-navy-400 to-navy-600 text-white ring-white/20",
  primary: "bg-brand-gradient text-white ring-white/25",
  success: "bg-linear-to-br from-teal-600 to-teal-700 text-white ring-white/25",
  warning:
    "bg-linear-to-br from-amber-warn-600 to-amber-warn-700 text-white ring-white/25",
};

/**
 * A single bordered strip of key figures rather than a row of floating boxes.
 * Reads as one instrument panel and avoids orphaned cards on wide screens.
 */
export function MetricStrip({ metrics, className }: { metrics: Metric[]; className?: string }) {
  return (
    <Card
      className={cn(
        "overflow-hidden bg-linear-to-br from-[var(--app-primary-soft)]/60 via-[var(--app-panel)] to-[var(--app-panel)] p-0",
        className,
      )}
    >
      <dl className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={cn(
              "group relative flex min-w-0 flex-col items-start gap-2 border-[var(--app-border)] px-4 py-4",
              "transition-colors hover:bg-[var(--app-panel-muted)]/45",
              // Interior rules only, so the strip keeps one clean outer edge.
              "border-t border-l",
              index % 2 === 0 && "border-l-0",
              index < 2 && "border-t-0",
              "sm:border-l sm:[&:nth-child(4n+1)]:border-l-0 sm:[&:nth-child(-n+4)]:border-t-0",
              "xl:border-t-0 xl:border-l xl:first:border-l-0",
            )}
          >
            {/* The label wraps rather than truncating, so no figure loses its name. */}
            <dt className="flex items-start gap-2 text-[11px] font-medium leading-4 text-[var(--app-text-muted)]">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md shadow-xs ring-1 ring-inset",
                  TONE_CHIP[metric.tone ?? "neutral"],
                )}
                aria-hidden
              >
                <metric.icon className="size-3.5" />
              </span>
              <span className="mt-1 text-pretty">{metric.label}</span>
            </dt>
            <dd>
              <span className="text-[26px] font-semibold leading-none tabular-nums tracking-[-0.03em]">
                {formatNumber(metric.value)}
              </span>
              {metric.hint ? (
                <span className="mt-1.5 block text-[11px] text-[var(--app-text-subtle)]">
                  {metric.hint}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Standalone metric tile, used where a single figure needs its own card. */
export function MetricCard({ label, value, icon: Icon, tone = "neutral", hint }: Metric) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--app-text-muted)]">{label}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tabular-nums tracking-[-0.03em]">
            {formatNumber(value)}
          </p>
          {hint ? <p className="mt-2 text-[11px] text-[var(--app-text-subtle)]">{hint}</p> : null}
        </div>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg shadow-xs ring-1 ring-inset",
            TONE_CHIP[tone],
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
      </div>
    </Card>
  );
}
