import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleRouteError, apiError } from "@/server/api";
import { isDemoMode } from "@/server/env";
import { getDiscoveryJob } from "@/server/automation/service";
export async function GET(_: Request, context: {params: Promise<{id:string}>}) {
  const session = await requireSession(); if (!session.ok) return session.response;
  if (isDemoMode()) return apiError("Discovery progress requires live database mode.",409);
  try {
    const {id} = await context.params;
    if (!z.string().uuid().safeParse(id).success) return apiError("Invalid discovery job ID.",422);
    return NextResponse.json(await getDiscoveryJob(id),{headers:{"cache-control":"no-store"}});
  } catch (error) { return handleRouteError(error); }
}
