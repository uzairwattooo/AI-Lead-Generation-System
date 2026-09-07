import { NextResponse } from "next/server";

import { workspaceSettingsSchema } from "@/lib/schemas";
import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { repository } = await getRepositoryContext();
    return NextResponse.json(await repository.getSettings());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const parsed = workspaceSettingsSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("The settings are not valid.", 422, parsed.error.issues);
    const { repository } = await getRepositoryContext();
    return NextResponse.json(await repository.updateSettings(parsed.data));
  } catch (error) {
    return handleRouteError(error);
  }
}
