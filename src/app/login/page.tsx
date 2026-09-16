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
    <main id="main-content" className="flex min-h-dvh flex-col bg-[var(--app-bg)]">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
        <Link href="/" className="mx-auto" aria-label="Code Nativex home">
          <Logo />
        </Link>

        <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-(--shadow-card)">
          <h1 className="text-[17px] font-semibold">Access your workspace</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--app-text-muted)]">
            Sign in or create an account. Lead and outreach data stays private to authenticated members.
          </p>
          <Suspense fallback={<div className="mt-6 h-52 skeleton rounded-md" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[12px] text-[var(--app-text-muted)]">
          <Link href="/" className="hover:text-[var(--app-text)]">
            Return to the public site
          </Link>
        </p>
      </div>
    </main>
  );
}
