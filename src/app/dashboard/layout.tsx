import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { isDemoMode } from "@/server/env";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | CodeNativeX" },
  robots: { index: false, follow: false },
};

// Authentication must be checked for every dashboard request, never at build time.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isDemoMode()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
