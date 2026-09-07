import { NextResponse } from "next/server";

import { handleRouteError, requireSession } from "@/server/api";
import { isDemoMode, serverEnv } from "@/server/env";
import type { AgentConnectionStatus } from "@/types";

/**
 * Reports whether the agent workflows are reachable. Only the resulting status
 * is returned - webhook URLs and secrets stay on the server.
 */
export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const demo = isDemoMode();
    const status: AgentConnectionStatus = {
      opportunityHunter: demo ? "degraded" : serverEnv.n8nLeadRequestWebhookUrl ? "online" : "offline",
      outreachAgent: demo ? "degraded" : serverEnv.n8nOutreachWebhookUrl ? "online" : "offline",
      checkedAt: new Date().toISOString(),
      mode: demo ? "demo" : "live",
    };
    return NextResponse.json(status);
  } catch (error) {
    return handleRouteError(error);
  }
}
