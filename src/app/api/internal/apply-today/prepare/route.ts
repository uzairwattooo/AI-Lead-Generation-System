import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleRouteError } from "@/server/api";
import { isDemoMode } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { prepareProject } from "@/server/apply-today-prepare";

export const maxDuration = 60;

export async function POST(request: Request) {
  const expected = Buffer.from(process.env.N8N_WEBHOOK_SECRET || "");
  const supplied = Buffer.from(request.headers.get("x-codenativex-intake-key") || "");
  if (!expected.length || expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
    return apiError("Unauthorized.", 403);
  if (isDemoMode()) return apiError("Live database mode required.", 409);
  try {
    const { candidateId } = z.object({ candidateId: z.string().uuid() }).strict().parse(await request.json());
    const db = createSupabaseAdminClient();
    const existing = await db.from("project_applications").select("stage").eq("candidate_id", candidateId).maybeSingle();
    if (existing.error) throw new Error("Could not check application history.");
    if (existing.data) return NextResponse.json({ state: "already_tracked" });
    const project = await db.from("lead_discovery_candidates").select("company_name,source_url,raw_payload")
      .eq("id", candidateId).like("source", "job\\_platform%")
      .is("dashboard_deleted_at", null).neq("review_status", "rejected").maybeSingle();
    if (project.error) throw new Error("Could not load the discovery record.");
    if (!project.data) return apiError("Job-platform project not found.", 404);
    const result = await prepareProject(project.data);
    if (result.state !== "draft_ready") return NextResponse.json(result);
    const saved = await db.from("project_applications")
      .upsert({candidate_id:candidateId, stage:"ready", ...result.draft},
        {onConflict:"candidate_id", ignoreDuplicates:true}).select("candidate_id");
    if (saved.error) throw new Error("Could not save the prepared proposal. Check the Apply Today migration.");
    return NextResponse.json({ state: saved.data?.length ? "ready" : "already_tracked" });
  } catch (error) { return handleRouteError(error); }
}
