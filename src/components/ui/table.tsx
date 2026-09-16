import * as React from "react";
import { cn } from "@/lib/utils";

export function TableWrapper({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("scrollbar-thin w-full overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-[var(--app-panel-muted)]",
        "[&_tr]:border-b [&_tr]:border-[var(--app-border-strong)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--app-border)] transition-colors last:border-0 hover:bg-[var(--app-panel-muted)]/60",
        "data-[selected=true]:bg-cobalt-50 dark:data-[selected=true]:bg-cobalt-900/30",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-9 whitespace-nowrap px-3 text-left align-middle text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2.5 align-middle text-[13px]", className)} {...props} />;
}
