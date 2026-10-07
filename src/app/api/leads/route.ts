import { NextResponse, type NextRequest } from "next/server";

import { handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";
import type { LeadQuery } from "@/server/data/repository";

function listParam(params: URLSearchParams, key: string): string[] | undefined {
  const raw = params.get(key);
  if (!raw) return undefined;
  const values = raw.split(",").map((value) => value.trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  try {
    const params = request.nextUrl.searchParams;
    const query: LeadQuery = {
      page: Math.max(1, numberParam(params, "page") ?? 1),
      pageSize: Math.min(100, Math.max(5, numberParam(params, "pageSize") ?? 25)),
      search: params.get("search") ?? undefined,
      requestId: params.get("requestId") ?? undefined,
      categories: listParam(params, "categories"),
      location: params.get("location") ?? undefined,
      verification: listParam(params, "verification"),
      outreach: listParam(params, "outreach"),
      approval: listParam(params, "approval"),
      contact: listParam(params, "contact"),
      recommendedOnly: params.get("recommendedOnly") === "true",
      minScore: numberParam(params, "minScore"),
      maxScore: numberParam(params, "maxScore"),
      sortBy: params.get("sortBy") ?? "recommended",
      sortDir: params.get("sortDir") === "asc" ? "asc" : "desc",
    };

    const { repository } = await getRepositoryContext();
    return NextResponse.json(await repository.listLeads(query), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
