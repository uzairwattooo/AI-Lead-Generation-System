import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `interactive` adds a hover lift. Use it only on cards that are themselves a
 * link or button target, so motion always signals that something is clickable.
 */
export function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "surface-raised rounded-[var(--radius-card)] border border-[var(--app-border)]",
        interactive &&
          "transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--app-border-strong)] hover:shadow-(--shadow-raised)",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 border-b border-[var(--app-border)] px-4 py-3.5 sm:px-5",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-[13px] font-semibold tracking-[-0.005em] text-[var(--app-text)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[11px] leading-relaxed text-[var(--app-text-muted)]", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-4 py-4 sm:px-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-b-[var(--radius-card)] border-t border-[var(--app-border)] bg-[var(--app-panel-muted)]/45 px-4 py-3 sm:px-5",
        className,
      )}
      {...props}
    />
  );
}
