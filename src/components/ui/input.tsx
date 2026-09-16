import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[var(--radius-control)] border border-[var(--app-border-strong)] bg-[var(--app-panel)] px-3 text-[13px] text-[var(--app-text)]",
          "transition-colors duration-150",
          "placeholder:text-[var(--app-text-subtle)]",
          "hover:border-[var(--app-text-subtle)]",
          "focus-visible:border-[var(--app-primary)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--app-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "aria-invalid:border-danger-500 aria-invalid:outline-danger-500",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-20 w-full rounded-[var(--radius-control)] border border-[var(--app-border-strong)] bg-[var(--app-panel)] px-3 py-2 text-[13px] text-[var(--app-text)]",
          "transition-colors duration-150",
          "placeholder:text-[var(--app-text-subtle)]",
          "hover:border-[var(--app-text-subtle)]",
          "focus-visible:border-[var(--app-primary)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--app-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "aria-invalid:border-danger-500",
          className,
        )}
        {...props}
      />
    );
  },
);
