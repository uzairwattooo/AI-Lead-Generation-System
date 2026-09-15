import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handleRouteError } from "@/server/api";
import { runWebsiteAudit } from "@/server/audits/audit-engine";
import { requireN8nSecret } from "@/server/internal-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({ leadId: z.string().uuid() });

export async function POST(request: Request) {
  const authError = requireN8nSecret(request);
  if (authError) return authError;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("A valid leadId is required.", 422, parsed.error.issues);
    return NextResponse.json(await runWebsiteAudit(parsed.data.leadId));
  } catch (error) {
    return handleRouteError(error);
  }
}
