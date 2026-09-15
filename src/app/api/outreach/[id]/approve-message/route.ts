import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";
import { dispatchToN8n } from "@/server/n8n";

const schema = z.object({ messageId: z.string().min(1) });

/** Approves a generated email so the Outreach Agent may send it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("A message id is required.", 422, parsed.error.issues);
    const { repository } = await getRepositoryContext();
    const record = await repository.approveOutreachMessage(id, parsed.data.messageId);
    const dispatch = await dispatchToN8n("outreach", {
      approvedBy: session.email,
      leadIds: [record.leadId],
      outreachIds: [record.id],
      mode: "send_approved",
    });
    return NextResponse.json({ ...record, dispatch });
  } catch (error) {
    return handleRouteError(error);
  }
}
