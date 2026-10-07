import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { apiError, handleRouteError } from "@/server/api";
import { getRepositoryContext } from "@/server/data";

function authorized(request: Request) {
  const expected = process.env.LEAD_TOOLS_SHARED_SECRET ?? "";
  const supplied = request.headers.get("x-codenativex-tools-key") ?? "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected); const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  if (!authorized(request)) return apiError("Tools integration authentication failed.", 403);
  try {
    const { requestId } = await params;
    const { repository } = await getRepositoryContext();
    const result = await repository.listLeads({
      page: 1,
      pageSize: 100,
      requestId,
      sortBy: "recommended",
      sortDir: "desc",
    });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { return handleRouteError(error); }
}
