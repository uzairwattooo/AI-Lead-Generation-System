import { NextResponse } from "next/server";

import { noteSchema } from "@/lib/schemas";
import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const parsed = noteSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("The note is not valid.", 422, parsed.error.issues);
    const { repository } = await getRepositoryContext();
    return NextResponse.json(await repository.addNote(id, parsed.data.body, session.email), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
