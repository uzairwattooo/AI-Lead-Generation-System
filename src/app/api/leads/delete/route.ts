import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";

const schema = z.object({ leadIds: z.array(z.string().min(1)).min(1).max(100) });
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("Select up to 100 leads to remove.", 422);
    const { repository } = await getRepositoryContext();
    return NextResponse.json({ deleted: await repository.deleteLeads(parsed.data.leadIds) });
  } catch (error) { return handleRouteError(error); }
}
