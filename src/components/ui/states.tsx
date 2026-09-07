"use client";

import * as React from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-[var(--app-panel-muted)] text-[var(--app-text-subtle)]">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-medium text-[var(--app-text)]">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-[var(--app-text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-700/20">
        <AlertTriangle className="size-5" />
      </span>
      <p className="text-sm font-medium text-[var(--app-text)]">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-[var(--app-text-muted)]">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
