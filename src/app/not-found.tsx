import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="cnx-grid-bg flex min-h-dvh items-center justify-center px-4">
      <div className="cnx-surface relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--app-border-strong)] p-8 text-center shadow-(--shadow-overlay)">
        <span aria-hidden className="cnx-brand-line absolute inset-x-0 top-0 h-1" />
        <Logo className="mx-auto h-11 w-[172px]" />
        <span className="mx-auto mt-8 flex size-14 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel-muted)] text-[var(--app-text-muted)]">
          <SearchX className="size-6" aria-hidden />
        </span>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-primary)]">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">This page could not be found</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--app-text-muted)]">
          The page you requested does not exist, or your account does not have access to it.
        </p>
        <Button asChild className="mt-7">
          <Link href="/dashboard">
            <ArrowLeft aria-hidden />
            Go to dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}

