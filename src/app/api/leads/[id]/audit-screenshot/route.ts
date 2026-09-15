import { NextResponse } from "next/server";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { serverEnv } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase-admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const admin = createSupabaseAdminClient();
    const { data: audit, error } = await admin.from("website_audits").select("screenshot_path").eq("lead_id", id).not("screenshot_path", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`Could not load audit screenshot: ${error.message}`);
    if (!audit?.screenshot_path) return apiError("No audit screenshot is available for this lead.", 404);
    const { data, error: downloadError } = await admin.storage.from(serverEnv.auditStorageBucket).download(audit.screenshot_path);
    if (downloadError) throw new Error(`Could not download audit screenshot: ${downloadError.message}`);
    return new NextResponse(await data.arrayBuffer(), { headers: { "content-type": data.type || "image/jpeg", "cache-control": "private, max-age=300" } });
  } catch (error) {
    return handleRouteError(error);
  }
}
