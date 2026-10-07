import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { leadSearchCriteriaSchema } from "@/lib/schemas";
import { apiError, handleRouteError } from "@/server/api";
import { getRepositoryContext } from "@/server/data";
import { N8nDispatchError, dispatchToN8n } from "@/server/n8n";

function requireToolsSecret(request: Request) {
  const expected = process.env.LEAD_TOOLS_SHARED_SECRET ?? "";
  const supplied = request.headers.get("x-codenativex-tools-key") ?? "";
  if (!expected || !supplied) return apiError("Tools integration authentication is required.", 401);
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return apiError("Tools integration authentication failed.", 403);
  return null;
}

export async function POST(request: Request) {
  const authError = requireToolsSecret(request);
  if (authError) return authError;

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("The request body must be valid JSON.", 400); }
  const parsed = leadSearchCriteriaSchema.safeParse(body);
  if (!parsed.success) return apiError("The lead search request is not valid.", 422, parsed.error.issues);

  try {
    const { repository } = await getRepositoryContext();
    const created = await repository.createRequest(parsed.data, "codenativex-tools");
    try {
      const dispatch = await dispatchToN8n("leadRequest", {
        requestId: created.id,
        requestedBy: "codenativex-tools",
        criteria: parsed.data,
        processingMode: "human_review",
        stopAfterDiscovery: true,
        keepAllDiscovered: true,
        recommendedLeadCount: 2,
      });
      return NextResponse.json({ request: created, ...dispatch }, { status: 201 });
    } catch (error) {
      if (error instanceof N8nDispatchError) {
        return NextResponse.json({ request: created, dispatched: false, detail: error.message }, { status: 502 });
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
