import { NextResponse, type NextRequest } from "next/server";

import { handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(limitParam) ? Math.min(500, Math.max(1, limitParam)) : 100;
    const { repository } = await getRepositoryContext();
    return NextResponse.json(await repository.listActivity(limit));
  } catch (error) {
    return handleRouteError(error);
  }
}
