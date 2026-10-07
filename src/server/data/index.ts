import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode, serverEnv } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
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

  // Dashboard and tools routes authenticate before they request a repository.
  // Use the server-only service-role client for database access so candidate
  // inventory is not silently hidden by incomplete/legacy RLS policies. The
  // key never reaches the browser, while the route-level session/shared-secret
  // guards continue to control who can access these records.
  const dataClient = serverEnv.supabaseServiceRoleKey
    ? createSupabaseAdminClient()
    : supabase;

  return { repository: new SupabaseAdapter(dataClient, userEmail), userEmail };
}

export type { LeadRepository } from "./repository";
