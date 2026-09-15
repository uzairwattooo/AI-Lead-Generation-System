import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/server/env";

export function createSupabaseAdminClient() {
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    throw new Error("Supabase admin credentials are not configured.");
  }

  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
