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

/** Icons are tinted only; the figure itself carries the emphasis. */
const TONE_ICON: Record<NonNullable<Metric["tone"]>, string> = {
  neutral: "text-[var(--app-text-subtle)]",
  primary: "text-[var(--app-primary)]",
  success: "text-teal-600 dark:text-teal-500",
  warning: "text-amber-warn-600 dark:text-amber-warn-500",
};

/*
 * The strip is laid out at 2 / 4 / 7 columns. A metric count that does not
 * divide evenly into those leaves a ragged hole at the end of the last row —
 * seven metrics divide into none of them. Widening the final cell to fill the
 * remainder keeps the strip a complete rectangle at every breakpoint.
 *
 * Tailwind only emits classes it can see, so the spans are listed literally.
 */
const LAST_SPAN: Record<"base" | "sm" | "xl", Record<number, string>> = {
  base: { 1: "col-span-1", 2: "col-span-2" },
  sm: {
    1: "sm:col-span-1",
    2: "sm:col-span-2",
    3: "sm:col-span-3",
    4: "sm:col-span-4",
  },
  xl: {
    1: "xl:col-span-1",
    2: "xl:col-span-2",
    3: "xl:col-span-3",
    4: "xl:col-span-4",
    5: "xl:col-span-5",
    6: "xl:col-span-6",
    7: "xl:col-span-7",
  },
};

/**
 * Columns the final cell must occupy to close its row, per breakpoint.
 *
 * Every breakpoint emits a class even when the span is 1. Without that reset a
 * wider span from a smaller breakpoint keeps applying further up and wraps the
 * final cell onto a row of its own.
 */
function lastCellSpan(count: number): string {
  const spanFor = (columns: number, breakpoint: "base" | "sm" | "xl") => {
    const remainder = count % columns;
    const span = remainder === 0 ? 1 : columns - remainder + 1;
    return LAST_SPAN[breakpoint][span] ?? "";
  };
  return [spanFor(2, "base"), spanFor(4, "sm"), spanFor(7, "xl")]
    .filter(Boolean)
    .join(" ");
}

/**
 * One bordered strip of key figures rather than a row of floating boxes.
 *
 * Every cell uses the same three-part structure — caption, figure, optional
 * hint — on a fixed vertical rhythm, and the hint row is always reserved even
 * when empty. That keeps the figures on one baseline across all cells, which
 * is what lets the strip be read as a table instead of a collection of tiles.
 */
export function MetricStrip({ metrics, className }: { metrics: Metric[]; className?: string }) {
  const hasAnyHint = metrics.some((metric) => metric.hint);
  const lastSpan = lastCellSpan(metrics.length);

  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <dl className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={cn(
              "flex min-w-0 flex-col gap-2 border-[var(--app-border)] px-4 py-3.5",
              // Interior rules only, so the strip keeps one clean outer edge.
              "border-t border-l",
              index % 2 === 0 && "border-l-0",
              index < 2 && "border-t-0",
              "sm:border-l sm:[&:nth-child(4n+1)]:border-l-0 sm:[&:nth-child(-n+4)]:border-t-0",
              "xl:border-t-0 xl:border-l xl:first:border-l-0",
              index === metrics.length - 1 && lastSpan,
            )}
          >
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--app-text-muted)]">
              <metric.icon
                className={cn("size-3.5 shrink-0", TONE_ICON[metric.tone ?? "neutral"])}
                aria-hidden
              />
              <span className="truncate">{metric.label}</span>
            </dt>
            <dd className="flex flex-col gap-1">
              <span className="text-[22px] font-semibold leading-none tabular-nums tracking-[-0.02em]">
                {formatNumber(metric.value)}
              </span>
              {hasAnyHint ? (
                <span className="min-h-4 text-[11px] leading-4 text-[var(--app-text-subtle)]">
                  {metric.hint ?? ""}
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
    <Card className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--app-text-muted)]">
            <Icon className={cn("size-3.5 shrink-0", TONE_ICON[tone])} aria-hidden />
            <span className="truncate">{label}</span>
          </p>
          <span className="text-[22px] font-semibold leading-none tabular-nums tracking-[-0.02em]">
            {formatNumber(value)}
          </span>
          {hint ? (
            <span className="text-[11px] leading-4 text-[var(--app-text-subtle)]">{hint}</span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
