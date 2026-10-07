import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";
import { dispatchToN8n } from "@/server/n8n";

const schema = z.object({
  leadIds: z.array(z.string().min(1)).min(1, "Select at least one lead"),
  options: z.object({
    prepareAuditReport: z.boolean(),
    enableBookingLink: z.boolean(),
  }).default({ prepareAuditReport: true, enableBookingLink: true }),
});

/** Starts evidence-based audit + email preparation for approved leads. */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("No leads were selected.", 422, parsed.error.issues);

    const { repository } = await getRepositoryContext();
    const records = await repository.sendToOutreach(parsed.data.leadIds, parsed.data.options);

    if (records.length === 0) {
      return apiError(
        "None of the selected leads could be prepared. Leads must be approved, contactable, non-duplicate, and not already sent.",
        409,
      );
    }

    const dispatch = await dispatchToN8n("audit", {
      queuedBy: session.email,
      leadIds: records.map((record) => record.leadId),
      mode: "audit_and_prepare_draft",
    });

    return NextResponse.json({ queued: records.length, records, ...dispatch }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
