import type { Metadata } from "next";
import { Suspense } from "react";

import { LeadsPageClient } from "./leads-client";

export const metadata: Metadata = { title: "All Leads" };

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 w-full rounded-md" />}>
      <LeadsPageClient />
    </Suspense>
  );
}
