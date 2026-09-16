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
  const toneClass = {
    primary: "bg-[var(--app-primary-fill)]",
    success: "bg-teal-600",
    warning: "bg-amber-warn-600",
    danger: "bg-danger-600",
  }[tone];

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={value}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--app-panel-muted)]",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          toneClass,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
});
