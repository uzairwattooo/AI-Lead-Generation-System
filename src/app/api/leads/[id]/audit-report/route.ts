import { NextResponse } from "next/server";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { serverEnv } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const admin = createSupabaseAdminClient();
    const { data: audit, error } = await admin
      .from("website_audits")
      .select("report_path, report_filename")
      .eq("lead_id", id)
      .not("report_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Could not load audit report: ${error.message}`);
    if (!audit?.report_path) return apiError("No audit PDF is available for this lead.", 404);
    const { data, error: downloadError } = await admin.storage
      .from(serverEnv.auditStorageBucket)
      .download(audit.report_path);
    if (downloadError) throw new Error(`Could not download audit report: ${downloadError.message}`);
    const bytes = await data.arrayBuffer();
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new NextResponse(bytes, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `${disposition}; filename="${audit.report_filename ?? "CodeNativeX-Website-Audit.pdf"}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
