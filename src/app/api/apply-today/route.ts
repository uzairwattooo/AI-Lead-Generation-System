import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleRouteError, requireSession } from "@/server/api";
import { isDemoMode } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { safeProjectUrl, stages } from "@/lib/apply-today";

const input = z.object({
  candidate_id: z.string().uuid(),
  stage: z.enum(stages),
  requirement: z.string().trim().max(1500),
  fit: z.string().trim().max(1500),
  portfolio_url: z.string().trim().max(2048).refine(value => !value || !!safeProjectUrl(value)),
  proposal: z.string().trim().max(6000),
}).strict();

function candidates() {
  return createSupabaseAdminClient().from("lead_discovery_candidates")
    .select("id,company_name,source,source_url,created_at")
    .like("source", "job\\_platform%").is("dashboard_deleted_at", null).neq("review_status", "rejected");
}

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  if (isDemoMode()) return apiError("Apply Today requires live database mode.", 409);
  try {
    const db = createSupabaseAdminClient();
    const results = await Promise.all([
      candidates().order("created_at", { ascending: false }).limit(250),
      db.from("project_applications").select("*").order("updated_at", { ascending: false }).limit(1000),
    ]);
    const [projects, applications] = results;
    if (applications.error?.code === "42P01" || applications.error?.code === "PGRST205")
      return apiError("Apply the Apply Today Supabase migration to enable this workspace.", 503);
    if (projects.error || applications.error) return apiError("Could not load project applications.", 500);
    const tracked = applications.data ?? [];
    const recent = projects.data ?? [];
    const seen = new Set(recent.map(row => row.id));
    const missing = tracked.map(row => row.candidate_id).filter(id => !seen.has(id));
    for (let offset = 0; offset < missing.length; offset += 100) {
      const extra = await candidates().in("id", missing.slice(offset, offset + 100));
      if (extra.error) return apiError("Could not load tracked projects.", 500);
      recent.push(...(extra.data ?? []));
    }
    const byId = new Map(tracked.map(row => [row.candidate_id, row]));
    return NextResponse.json({ projects: recent.map(row => ({
      id: row.id, title: row.company_name, sourceUrl: safeProjectUrl(row.source_url),
      application: byId.get(row.id) ?? null,
    })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleRouteError(error); }
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  if (isDemoMode()) return apiError("Apply Today requires live database mode.", 409);
  try {
    const parsed = input.parse(await request.json());
    const project = await candidates().eq("id", parsed.candidate_id).maybeSingle();
    if (project.error) return apiError("Could not verify the discovery record.", 500);
    if (!project.data || !safeProjectUrl(project.data.source_url))
      return apiError("Select an available job-platform project with an original post.", 404);
    const { data, error } = await createSupabaseAdminClient().from("project_applications")
      .upsert({ ...parsed, updated_at: new Date().toISOString() }).select("*").single();
    if (error) return apiError("Could not save the application.", 500);
    return NextResponse.json({ application: data });
  } catch (error) { return handleRouteError(error); }
}
