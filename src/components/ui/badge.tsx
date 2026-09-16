import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap shadow-xs",
  {
    variants: {
      tone: {
        neutral:
          "border-[var(--app-border)] bg-[var(--app-panel-muted)] text-[var(--app-text-muted)]",
        info: "border-cobalt-200 bg-cobalt-50 text-cobalt-700 dark:border-cobalt-800 dark:bg-cobalt-900/40 dark:text-cobalt-200",
        success:
          "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-700/25 dark:text-teal-100",
        warning:
          "border-amber-warn-100 bg-amber-warn-50 text-amber-warn-700 dark:border-amber-warn-700 dark:bg-amber-warn-700/25 dark:text-amber-warn-100",
        danger:
          "border-danger-100 bg-danger-50 text-danger-700 dark:border-danger-700 dark:bg-danger-700/25 dark:text-danger-100",
        outline: "border-[var(--app-border-strong)] bg-transparent text-[var(--app-text-muted)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
