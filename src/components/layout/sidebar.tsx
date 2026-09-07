"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-items";

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4 px-2 py-3" aria-label="Dashboard sections">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {collapsed ? (
            <span className="mx-auto mb-1 h-px w-6 bg-[var(--app-border)]" aria-hidden />
          ) : (
            <h2 className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-subtle)]">
              {group.label}
            </h2>
          )}

          {group.items.map((item) => {
            const active = isActivePath(pathname, item.href);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[var(--app-panel-muted)] text-[var(--app-text)]"
                    : "text-[var(--app-text-muted)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]",
                  collapsed && "justify-center px-2",
                )}
              >
                {/* Active marker reads as a rail rather than a filled block. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--app-primary)] transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <item.icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active ? "text-[var(--app-primary)]" : "text-[var(--app-text-subtle)] group-hover:text-[var(--app-text-muted)]",
                  )}
                  aria-hidden
                />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
                {collapsed ? <span className="sr-only">{item.label}</span> : null}
              </Link>
            );

            if (!collapsed) return link;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">
                  <span className="font-medium">{item.label}</span>
                  <span className="mt-0.5 block opacity-75">{item.description}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function DesktopSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r border-[var(--app-border)] bg-[var(--app-panel)] transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-[var(--app-border)] px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Link href="/dashboard" aria-label="CodeNativeX dashboard home">
          <Logo showWordmark={!collapsed} />
        </Link>
        {!collapsed ? (
          <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Collapse sidebar">
            <PanelLeftClose aria-hidden />
          </Button>
        ) : null}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <SidebarNav collapsed={collapsed} />
      </div>

      {collapsed ? (
        <div className="border-t border-[var(--app-border)] p-2">
          <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Expand sidebar" className="w-full">
            <PanelLeftOpen aria-hidden />
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
