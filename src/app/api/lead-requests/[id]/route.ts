import { NextResponse } from "next/server";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const { repository } = await getRepositoryContext();
    const found = await repository.getRequest(id);
    if (!found) return apiError("That lead request could not be found.", 404);
    return NextResponse.json(found);
  } catch (error) {
    return handleRouteError(error);
  }
}
