"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, publicEnv } from "@/lib/public-env";

/**
 * Browser Supabase client, used for authentication only. Business data always
 * travels through the Next.js API routes so that no service-role access or
 * webhook secret is ever exposed to the browser.
 */
export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
