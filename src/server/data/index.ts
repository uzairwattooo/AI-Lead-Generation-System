import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/server/env";
import { DemoAdapter } from "./demo-adapter";
import { SupabaseAdapter } from "./supabase-adapter";
import type { LeadRepository } from "./repository";

export interface RepositoryContext {
  repository: LeadRepository;
  userEmail: string;
}

/**
 * Resolves the adapter for the current request. Demo mode is used when it is
 * explicitly enabled or when Supabase credentials are absent, so the UI is
 * always previewable without leaking a half-configured live backend.
 */
export async function getRepositoryContext(): Promise<RepositoryContext> {
  if (isDemoMode()) {
    return { repository: new DemoAdapter(), userEmail: "demo@codenativex.com" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { repository: new DemoAdapter(), userEmail: "demo@codenativex.com" };
  }

  const { data } = await supabase.auth.getUser();
  const userEmail = data.user?.email ?? "unknown@codenativex.com";
  return { repository: new SupabaseAdapter(supabase, userEmail), userEmail };
}

export type { LeadRepository } from "./repository";
