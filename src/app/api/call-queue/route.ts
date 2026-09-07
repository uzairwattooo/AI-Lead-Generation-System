import { NextResponse } from "next/server";

import { handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { repository } = await getRepositoryContext();
    return NextResponse.json(await repository.listCallQueue());
  } catch (error) {
    return handleRouteError(error);
  }
}
