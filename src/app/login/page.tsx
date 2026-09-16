import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Workspace access",
  description: "Sign in or create an account for the Code Nativex Lead Generation System.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main id="main-content" className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--app-bg)]">
      {/* A single soft light source behind the card, so the sign-in screen is
          not a small box floating on an empty field. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-[40rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[var(--app-primary)]/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dot-grid opacity-30 [mask-image:radial-gradient(60%_50%_at_50%_40%,black,transparent)]"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Link href="/" className="mx-auto" aria-label="Code Nativex home">
          <Logo />
        </Link>

        <div className="surface-raised mt-8 rounded-[var(--radius-panel)] border border-[var(--app-border)] p-7 shadow-(--shadow-overlay) animate-rise-in">
          <h1 className="text-xl font-semibold tracking-[-0.025em]">Access your workspace</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--app-text-muted)]">
            Sign in or create an account. Lead and outreach data stays private to authenticated members.
          </p>
          <Suspense fallback={<div className="mt-6 h-52 skeleton rounded-md" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-7 text-center text-xs text-[var(--app-text-muted)]">
          <Link href="/" className="hover:text-[var(--app-text)]">
            Return to the public site
          </Link>
        </p>
      </div>
    </main>
  );
}
