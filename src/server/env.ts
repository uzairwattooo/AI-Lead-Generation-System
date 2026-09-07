/**
 * Server-side environment access.
 *
 * Values read here are never bundled into the client. Only the
 * NEXT_PUBLIC_* values in `src/lib/public-env.ts` reach the browser.
 */
export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  n8nLeadRequestWebhookUrl: process.env.N8N_LEAD_REQUEST_WEBHOOK_URL ?? "",
  n8nLeadRequestCancelUrl: process.env.N8N_LEAD_REQUEST_CANCEL_URL ?? "",
  n8nOutreachWebhookUrl: process.env.N8N_OUTREACH_WEBHOOK_URL ?? "",
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET ?? "",
} as const;

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  // Without Supabase credentials there is no live backend to talk to.
  return !serverEnv.supabaseUrl || !serverEnv.supabaseAnonKey;
}
