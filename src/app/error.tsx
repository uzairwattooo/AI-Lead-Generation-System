"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-700/20">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-sm text-[var(--app-text-muted)]">
        {error.message || "An unexpected error interrupted this page."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
