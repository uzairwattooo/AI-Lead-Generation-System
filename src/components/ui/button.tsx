"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    // Transform is included so the press feedback below actually animates.
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
    "active:translate-y-px",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-ring)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // Solid variants carry a top-edge highlight and a colour-matched glow,
        // which is what reads as a moulded control rather than a flat swatch.
        primary: [
          "bg-[var(--app-primary)] bg-brand-gradient text-white ring-1 ring-inset ring-white/15",
          "shadow-(--shadow-primary)",
          // Brightening on hover keeps the gradient rather than flattening it.
          "hover:brightness-110 hover:shadow-(--shadow-raised)",
        ],
        secondary:
          "border border-[var(--app-border-strong)] bg-[var(--app-panel)] bg-linear-to-b from-[var(--app-highlight)] to-transparent text-[var(--app-text)] shadow-(--shadow-card) hover:border-[var(--app-text-subtle)] hover:bg-[var(--app-panel-muted)]",
        ghost:
          "text-[var(--app-text-muted)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]",
        subtle:
          "bg-[var(--app-panel-muted)] text-[var(--app-text)] hover:bg-[var(--app-border)]",
        success:
          "bg-linear-to-br from-teal-600 to-teal-700 text-white ring-1 ring-inset ring-white/15 shadow-(--shadow-card) hover:brightness-110 hover:shadow-(--shadow-raised)",
        danger:
          "bg-linear-to-br from-danger-600 to-danger-700 text-white ring-1 ring-inset ring-white/15 shadow-(--shadow-card) hover:brightness-110 hover:shadow-(--shadow-raised)",
        link: "text-[var(--app-primary)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);

export { buttonVariants };
