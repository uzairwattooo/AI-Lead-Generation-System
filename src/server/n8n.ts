import "server-only";

import { serverEnv } from "./env";

export class N8nDispatchError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "N8nDispatchError";
    this.status = status;
  }
}

/**
 * Forwards a payload to an n8n workflow.
 *
 * The webhook URL and shared secret only ever exist on the server, so the
 * browser can never reach n8n directly.
 */
export async function dispatchToN8n(
  target: "leadRequest" | "cancelLeadRequest" | "audit" | "outreach",
  payload: unknown,
): Promise<{ dispatched: boolean; detail: string }> {
  const url =
    target === "leadRequest"
      ? serverEnv.n8nLeadRequestWebhookUrl
      : target === "cancelLeadRequest"
        ? serverEnv.n8nLeadRequestCancelUrl
        : target === "audit"
          ? serverEnv.n8nAuditWebhookUrl
          : serverEnv.n8nOutreachWebhookUrl;

  if (!url) {
    return {
      dispatched: false,
      detail: `No n8n webhook is configured for "${target}". The request was recorded but no agent was triggered.`,
    };
  }

  let response: Response;
  try {
    response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(serverEnv.n8nWebhookSecret ? { "x-codenativex-intake-key": serverEnv.n8nWebhookSecret } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    throw new N8nDispatchError(timedOut
      ? "The workflow did not respond in time. Your request was saved; check its status before submitting again."
      : "Could not connect to the workflow service. Your request was saved; check that n8n is running and the intake workflow is published.", timedOut ? 504 : 502);
  }

  if (!response.ok) {
    throw new N8nDispatchError(
      response.status === 404
        ? "The intake webhook was not found. Publish the intake workflow and check its production webhook URL. Your request was saved."
        : response.status === 401 || response.status === 403
          ? "The workflow rejected authorization. Check the webhook secret configuration. Your request was saved."
          : response.status === 400 || response.status === 422
            ? "The workflow rejected the submitted search criteria. Check the selected source, category and service. Additional instructions are optional. Your request was saved."
            : response.status === 429
              ? "The workflow service is rate-limited. Your request was saved; wait and check its status before trying again."
              : `The workflow service returned HTTP ${response.status}. Your request was saved; check n8n execution logs and request status before submitting again.`,
      response.status,
    );
  }

  return { dispatched: true, detail: "The workflow accepted the request." };
}
