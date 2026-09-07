import { NextResponse } from "next/server";

import { handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";
import { dispatchToN8n } from "@/server/n8n";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const { repository } = await getRepositoryContext();
    const updated = await repository.cancelRequest(id);
    await dispatchToN8n("cancelLeadRequest", { requestId: id, cancelledBy: session.email });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
