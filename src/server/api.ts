import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isSupabaseConfigured } from "@/lib/public-env";
import { isDemoMode } from "@/server/env";
import { getCurrentUser } from "@/lib/supabase/server";

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json<ApiErrorBody>({ error: message, details }, { status });
}

/**
 * Every data route runs through this guard. In demo mode there is no session to
 * check, so the demo identity is used; otherwise a valid Supabase session is
 * required and unauthenticated callers receive 401.
 */
export async function requireSession(): Promise<
  { ok: true; email: string } | { ok: false; response: NextResponse }
> {
  if (isDemoMode() || !isSupabaseConfigured) {
    return { ok: true, email: "demo@codenativex.com" };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: apiError("You must be signed in to access this resource.", 401) };
  }
  return { ok: true, email: user.email ?? "unknown@codenativex.com" };
}

/** Converts thrown errors into a consistent JSON error envelope. */
export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError("The submitted data is not valid.", 422, error.issues);
  }
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred while processing the request.";
  return apiError(message, 500);
}
