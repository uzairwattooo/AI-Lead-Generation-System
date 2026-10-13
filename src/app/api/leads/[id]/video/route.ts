import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleRouteError, requireSession } from "@/server/api";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { validateVideoUrl } from "@/server/outreach/reply-content";

const schema = z.object({ videoUrl: z.string().trim().max(2000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return apiError("Invalid lead ID.", 422);
    const input = schema.safeParse(await request.json());
    if (!input.success) return apiError("A video link is required.", 422);
    let videoUrl: string | null = null;
    try { if (input.data.videoUrl) videoUrl = validateVideoUrl(input.data.videoUrl); }
    catch { return apiError("Use a public HTTPS link to the recorded video.", 422); }
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("lead_pipeline").update({ outreach_video_url: videoUrl, updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return apiError("Prepare this approved lead for outreach before adding its video.", 404);
    // Only resume a request blocked before SMTP because its video was unavailable.
    // Ambiguous or failed sends are never retried by this operation.
    if (videoUrl) {
      const { error: resumeError } = await admin.from("codenativex_reply_actions")
        .update({ status: "pending", error_message: null, claim_key: null, claimed_at: null })
        .eq("lead_id", id).eq("status", "needs_review").eq("error_message", "video_not_ready")
        .in("action", ["video", "report_and_video"]);
      if (resumeError) throw new Error(resumeError.message);
    }
    return NextResponse.json({ saved: true, videoUrl });
  } catch (error) { return handleRouteError(error); }
}
