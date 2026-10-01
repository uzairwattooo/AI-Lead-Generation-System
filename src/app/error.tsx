"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="cnx-grid-bg flex min-h-dvh items-center justify-center px-4">
      <div className="cnx-surface relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--app-border-strong)] p-8 text-center shadow-(--shadow-overlay)">
        <span aria-hidden className="cnx-brand-line absolute inset-x-0 top-0 h-1" />
        <Logo className="mx-auto h-11 w-[172px]" />
        <span className="mx-auto mt-8 flex size-14 items-center justify-center rounded-2xl border border-danger-500/20 bg-danger-500/10 text-danger-500">
          <AlertTriangle className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--app-text-muted)]">
          {error.message || "An unexpected error interrupted this page."}
        </p>
        <Button onClick={reset} className="mt-7">
          <RefreshCw aria-hidden />
          Try again
        </Button>
      </div>
    </main>
  );
}

