import { NextResponse } from "next/server";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";

/** Polled by the request details page; also mirrors the Realtime payload shape. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const { repository } = await getRepositoryContext();
    const progress = await repository.getProgress(id);
    if (!progress) return apiError("That lead request could not be found.", 404);
    return NextResponse.json(progress, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return handleRouteError(error);
  }
}
