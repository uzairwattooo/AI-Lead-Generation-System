"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
const lists = [
  { href: "/dashboard/leads", label: "New leads" },
  { href: "/dashboard/approved", label: "Approved" },
  { href: "/dashboard/rejected", label: "Rejected" },
];
export function LeadReviewNav() {
  const pathname = usePathname();
  return <nav aria-label="Lead review lists" className="mb-4 flex flex-wrap gap-2">
    {lists.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}
      className={cn("rounded-md border px-4 py-2 text-sm font-medium transition-colors", pathname === item.href ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-white" : "border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]")}>{item.label}</Link>)}
  </nav>;
}
