import { NextResponse, type NextRequest } from "next/server";

import { leadSearchCriteriaSchema } from "@/lib/schemas";
import { apiError, handleRouteError, requireSession } from "@/server/api";
import { getRepositoryContext } from "@/server/data";
import { N8nDispatchError, dispatchToN8n } from "@/server/n8n";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { repository } = await getRepositoryContext();
    return NextResponse.json(await repository.listRequests());
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Creates a lead search request and triggers the Opportunity Hunter Agent.
 * The n8n webhook is called from here, never from the browser.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("The request body must be valid JSON.", 400);
  }

  const parsed = leadSearchCriteriaSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("The lead search request is not valid.", 422, parsed.error.issues);
  }

  try {
    const { repository } = await getRepositoryContext();
    const created = await repository.createRequest(parsed.data, session.email);

    let dispatch = { dispatched: false, detail: "" };
    try {
      dispatch = await dispatchToN8n("leadRequest", {
        requestId: created.id,
        requestedBy: session.email,
        criteria: parsed.data,
      });
    } catch (error) {
      if (error instanceof N8nDispatchError) {
        return NextResponse.json(
          {
            request: created,
            dispatched: false,
            detail: error.message,
          },
          { status: 502 },
        );
      }
      throw error;
    }

    return NextResponse.json({ request: created, ...dispatch }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
