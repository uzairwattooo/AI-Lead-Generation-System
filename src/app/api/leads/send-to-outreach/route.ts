import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";
import { dispatchToN8n } from "@/server/n8n";

const schema = z.object({ leadIds: z.array(z.string().min(1)).min(1, "Select at least one lead") });

/** Hands approved leads to the Outreach Agent through the n8n workflow. */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("No leads were selected.", 422, parsed.error.issues);

    const { repository } = await getRepositoryContext();
    const records = await repository.sendToOutreach(parsed.data.leadIds);

    if (records.length === 0) {
      return apiError(
        "None of the selected leads could be queued. Leads must be approved and not already in outreach.",
        409,
      );
    }

    const dispatch = await dispatchToN8n("outreach", {
      queuedBy: session.email,
      outreachIds: records.map((record) => record.id),
      leadIds: records.map((record) => record.leadId),
    });

    return NextResponse.json({ queued: records.length, records, ...dispatch }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
