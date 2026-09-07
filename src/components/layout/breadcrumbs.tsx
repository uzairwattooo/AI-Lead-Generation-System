"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { SEGMENT_LABELS } from "./nav-items";

/** Derives breadcrumbs from the current route. Ids are shown verbatim. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => ({
    label: SEGMENT_LABELS[segment] ?? segment,
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 text-xs text-[var(--app-text-muted)]">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden /> : null}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-[var(--app-text)]">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate hover:text-[var(--app-text)]">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
