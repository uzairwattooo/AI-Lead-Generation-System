import { NextResponse } from "next/server";

import { apiError, handleRouteError } from "@/server/api";
import { serverEnv } from "@/server/env";
import { requireN8nSecret } from "@/server/internal-auth";
import { createSupabaseAdminClient } from "@/server/supabase-admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireN8nSecret(request);
  if (authError) return authError;
  try {
    const { id } = await params;
    const admin = createSupabaseAdminClient();
    const { data: audit, error } = await admin.from("website_audits").select("report_path, report_filename").eq("lead_id", id).not("report_path", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`Could not load audit attachment: ${error.message}`);
    if (!audit?.report_path) return apiError("Audit attachment not found.", 404);
    const { data, error: downloadError } = await admin.storage.from(serverEnv.auditStorageBucket).download(audit.report_path);
    if (downloadError) throw new Error(`Could not download audit attachment: ${downloadError.message}`);
    return new NextResponse(await data.arrayBuffer(), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${audit.report_filename ?? "CodeNativeX-Website-Audit.pdf"}"`, "cache-control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error);
  }
}
