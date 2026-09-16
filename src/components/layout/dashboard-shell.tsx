"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { AgentStatusIndicator } from "./agent-status";
import { Breadcrumbs } from "./breadcrumbs";
import { NotificationsMenu } from "./notifications";
import { ProfileMenu } from "./profile-menu";
import { DesktopSidebar, SidebarNav } from "./sidebar";

const COLLAPSE_STORAGE_KEY = "codenativex.sidebar.collapsed";

const collapseListeners = new Set<() => void>();

function subscribeToCollapse(listener: () => void): () => void {
  collapseListeners.add(listener);
  return () => {
    collapseListeners.delete(listener);
  };
}

function getCollapsedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** The sidebar always renders expanded on the server. */
function getServerCollapsedSnapshot(): boolean {
  return false;
}

function setCollapsedPreference(next: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
  } catch {
    // Storage can be unavailable; the toggle simply does not persist.
  }
  for (const listener of collapseListeners) listener();
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  /**
   * The collapse preference lives in localStorage. Reading it through
   * useSyncExternalStore keeps the server snapshot (expanded) and the first
   * client render consistent, so there is no hydration mismatch.
   */
  const collapsed = React.useSyncExternalStore(
    subscribeToCollapse,
    getCollapsedSnapshot,
    getServerCollapsedSnapshot,
  );

  const toggleCollapsed = React.useCallback(() => {
    setCollapsedPreference(!getCollapsedSnapshot());
  }, []);

  return (
    <div className="flex min-h-dvh w-full bg-[var(--app-bg)]">
      <DesktopSidebar collapsed={collapsed} onToggle={toggleCollapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Translucent so content dissolves under the bar as it scrolls away. */}
        <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-panel)]/85 shadow-xs backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--app-panel)]/70">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu aria-hidden />
            </Button>

            <Link href="/dashboard" className="lg:hidden" aria-label="Code Nativex dashboard home">
              <Logo showWordmark={false} />
            </Link>

            <div className="hidden min-w-0 flex-1 lg:block">
              <Breadcrumbs />
            </div>
            <div className="min-w-0 flex-1 lg:hidden" />

            <div className="flex items-center gap-1.5">
              <div className="hidden sm:block">
                <AgentStatusIndicator />
              </div>
              <Button asChild size="sm" className="hidden md:inline-flex">
                <Link href="/dashboard/generate">
                  <Plus aria-hidden />
                  New search
                </Link>
              </Button>
              <NotificationsMenu />
              <ProfileMenu />
            </div>
          </div>
          <div className="border-t border-[var(--app-border)] px-3 py-2 lg:hidden">
            <Breadcrumbs />
          </div>
        </header>

        <main id="main-content" className="min-w-0 flex-1 px-3 py-5 sm:px-4 sm:py-7 lg:px-7">
          <div className="mx-auto w-full max-w-[1400px] animate-rise-in">{children}</div>
        </main>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent side="left" className="max-w-72">
          <DrawerTitle asChild>
            <div className="flex h-14 items-center border-b border-[var(--app-border)] px-3">
              <Logo />
            </div>
          </DrawerTitle>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            <SidebarNav collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </div>
          <div className="border-t border-[var(--app-border)] p-3">
            <AgentStatusIndicator />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
