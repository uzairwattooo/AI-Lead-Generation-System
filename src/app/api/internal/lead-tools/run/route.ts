import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError,handleRouteError } from "@/server/api";
import { requireN8nSecret } from "@/server/internal-auth";
import { runLeadToolJob } from "@/server/lead-tools/jobs";
export const maxDuration=300;
export async function POST(request:Request) {
  const auth=requireN8nSecret(request); if(auth) return auth;
  try { const body=z.object({jobId:z.string().uuid()}).safeParse(await request.json()); if(!body.success) return apiError("Invalid job ID.",422); return NextResponse.json(await runLeadToolJob(body.data.jobId)); }
  catch(error) {return handleRouteError(error);}
}
