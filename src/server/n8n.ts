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
  target: "leadRequest" | "cancelLeadRequest" | "outreach",
  payload: unknown,
): Promise<{ dispatched: boolean; detail: string }> {
  const url =
    target === "leadRequest"
      ? serverEnv.n8nLeadRequestWebhookUrl
      : target === "cancelLeadRequest"
        ? serverEnv.n8nLeadRequestCancelUrl
        : serverEnv.n8nOutreachWebhookUrl;

  if (!url) {
    return {
      dispatched: false,
      detail: `No n8n webhook is configured for "${target}". The request was recorded but no agent was triggered.`,
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(serverEnv.n8nWebhookSecret ? { "x-codenativex-intake-key": serverEnv.n8nWebhookSecret } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new N8nDispatchError(
      `The lead generation workflow rejected the request (HTTP ${response.status}).`,
      response.status,
    );
  }

  return { dispatched: true, detail: "The workflow accepted the request." };
}
