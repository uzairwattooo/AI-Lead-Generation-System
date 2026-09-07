"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--app-primary)] text-white shadow-xs hover:bg-[var(--app-primary-hover)]",
        secondary:
          "border border-[var(--app-border-strong)] bg-[var(--app-panel)] text-[var(--app-text)] shadow-xs hover:bg-[var(--app-panel-muted)]",
        ghost:
          "text-[var(--app-text-muted)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]",
        subtle:
          "bg-[var(--app-panel-muted)] text-[var(--app-text)] hover:bg-[var(--app-border)]",
        success:
          "bg-teal-600 text-white shadow-xs hover:bg-teal-700",
        danger:
          "bg-danger-600 text-white shadow-xs hover:bg-danger-700",
        link: "text-[var(--app-primary)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-5",
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
