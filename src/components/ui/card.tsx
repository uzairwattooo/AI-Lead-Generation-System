import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The single container primitive. Every card in the app uses the same border,
 * radius and padding steps: header and footer sit at `px-5 py-3`, body content
 * at `px-5 py-4`, so rows align across cards placed side by side.
 */
export function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-panel)] shadow-(--shadow-card)",
        interactive &&
          "transition-colors duration-150 hover:border-[var(--app-border-strong)]",
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
        "flex min-h-12 flex-col justify-center gap-0.5 border-b border-[var(--app-border)] px-4 py-3 sm:px-5",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-[13px] font-semibold text-[var(--app-text)]", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[12px] leading-relaxed text-[var(--app-text-muted)]", className)}
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
        "flex min-h-12 items-center gap-2 border-t border-[var(--app-border)] px-4 py-3 sm:px-5",
        className,
      )}
      {...props}
    />
  );
}
