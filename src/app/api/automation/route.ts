import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleRouteError, requireSession } from "@/server/api";
import { isDemoMode } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { prospectSchema, searchSchema } from "@/lib/automation/policy";
import {
  changeOpportunity,
  editEmail,
  listAutomation,
  saveProspect,
  recheckOpportunity,
} from "@/server/automation/service";
export const runtime = "nodejs";
export const maxDuration = 60;
const uuid = z.string().uuid();
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("search"), input: searchSchema }).strict(),
  z.object({ action: z.literal("retry_search"), id: uuid }).strict(),
  z.object({ action: z.literal("recheck_source"), id: uuid }).strict(),
  z.object({ action: z.literal("import"), input: prospectSchema }).strict(),
  z
    .object({
      action: z.enum(["approve", "approve_verified", "reject", "stop", "prepare"]),
      id: uuid,
    })
    .strict(),
  z
    .object({
      action: z.enum(["save", "approve_send"]),
      id: uuid,
      expectedUpdatedAt: z.string().datetime({ offset: true }),
      subject: z
        .string()
        .trim()
        .min(3)
        .max(160)
        .regex(/^[^\r\n]+$/)
        .optional(),
      body: z.string().trim().min(30).max(3000).optional(),
    })
    .strict(),
]);
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  if (isDemoMode())
    return apiError("AI opportunities requires live database mode.", 409);
  try {
    return NextResponse.json(await listAutomation());
  } catch (e) {
    return handleRouteError(e);
  }
}
export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  if (isDemoMode())
    return apiError("Disable demo mode to use live discovery.", 409);
  try {
    const body = actionSchema.parse(await request.json());
    if (body.action === "search") {
      const client = createSupabaseAdminClient();
      const { count, error: c } = await client
        .from("automation_discovery_jobs")
        .select("id", { count: "exact", head: true })
        .in("status", ["queued", "running"]);
      if (c) throw c;
      if ((count || 0) >= 5)
        return apiError(
          "Finish the current discovery jobs before adding more.",
          409,
        );
      const { data, error } = await client
        .from("automation_discovery_jobs")
        .insert({
          category: body.input.category,
          city: body.input.city,
          country: body.input.country,
          region: body.input.region,
          kind: body.input.kind,
          requested_count: body.input.limit,
          created_by: auth.email,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ saved: true, id: data.id });
    }
    if (body.action === "retry_search") {
      const client = createSupabaseAdminClient();
      const {data: previous,error: readError} = await client.from("automation_discovery_jobs").select("*").eq("id",body.id).single();
      if(readError) throw new Error(readError.message);
      if(!["failed","completed"].includes(previous.status)) return apiError("Wait for the current discovery run to finish.",409);
      const {count,error: countError} = await client.from("automation_discovery_jobs").select("id",{count:"exact",head:true}).in("status",["queued","running"]);
      if(countError) throw new Error(countError.message);
      if((count||0)>=5)return apiError("Finish the current discovery jobs before adding more.",409);
      const {data,error} = await client.from("automation_discovery_jobs").insert({
        category:previous.category,city:previous.city,country:previous.country,region:previous.region||"",kind:previous.kind,
        requested_count:previous.requested_count,created_by:auth.email,
      }).select("id").single();
      if(error)throw new Error(error.message);
      return NextResponse.json({saved:true,id:data.id});
    }
    if (body.action === "recheck_source")
      return NextResponse.json(await recheckOpportunity(body.id));
    if (body.action === "import")
      return NextResponse.json(await saveProspect(body.input, "business"));
    if (body.action === "save" || body.action === "approve_send") {
      if (body.action === "save" && (!body.subject || !body.body))
        return apiError("Subject and body are required.", 422);
      return NextResponse.json(
        await editEmail(
          body.id,
          body.action,
          body.subject,
          body.body,
          body.expectedUpdatedAt,
        ),
      );
    }
    return NextResponse.json(await changeOpportunity(body.id, body.action));
  } catch (e) {
    return handleRouteError(e);
  }
}




