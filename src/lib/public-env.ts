/** Public configuration that is safe to ship to the browser. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
} as const;

/** True when Supabase Auth can actually be used. */
export const isSupabaseConfigured =
  publicEnv.supabaseUrl.length > 0 && publicEnv.supabaseAnonKey.length > 0;
