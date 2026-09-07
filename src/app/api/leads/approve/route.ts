import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";

const schema = z.object({ leadIds: z.array(z.string().min(1)).min(1, "Select at least one lead") });

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("No leads were selected.", 422, parsed.error.issues);
    const { repository } = await getRepositoryContext();
    const updated = await repository.setApproval(parsed.data.leadIds, "approved");
    return NextResponse.json({ updated: updated.length, leads: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
