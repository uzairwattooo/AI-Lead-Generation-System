import Link from "next/link";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="text-xl font-semibold tracking-tight">This page could not be found</h1>
      <p className="max-w-sm text-sm text-[var(--app-text-muted)]">
        The page you requested does not exist, or you do not have access to it.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go to the dashboard</Link>
      </Button>
    </main>
  );
}
