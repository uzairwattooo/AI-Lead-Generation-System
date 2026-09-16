"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    value: number;
    tone?: "primary" | "success" | "warning" | "danger";
  }
>(function Progress({ className, value, tone = "primary", ...props }, ref) {
  // Each fill is a gradient along its own hue, so the bar reads as a lit
  // material rather than a flat block of colour.
  const toneClass = {
    primary: "bg-linear-to-r from-cobalt-500 to-cobalt-700",
    success: "bg-linear-to-r from-teal-500 to-teal-700",
    warning: "bg-linear-to-r from-amber-warn-500 to-amber-warn-700",
    danger: "bg-linear-to-r from-danger-500 to-danger-700",
  }[tone];

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={value}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-[var(--app-panel-muted)] ring-1 ring-inset ring-[var(--app-border)]",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full rounded-full shadow-xs transition-[width] duration-500 ease-out",
          toneClass,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
});
