"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-[var(--app-border-strong)] bg-[var(--app-panel)] shadow-xs",
        "data-[state=checked]:border-[var(--app-primary)] data-[state=checked]:bg-[var(--app-primary)] data-[state=checked]:text-white",
        "data-[state=indeterminate]:border-[var(--app-primary)] data-[state=indeterminate]:bg-[var(--app-primary)] data-[state=indeterminate]:text-white",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === "indeterminate" ? (
          <Minus className="size-3" aria-hidden />
        ) : (
          <Check className="size-3" aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
