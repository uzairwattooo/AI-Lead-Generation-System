/**
 * The single HTTP boundary for the browser.
 *
 * Every call goes to a Next.js API route on the same origin. The browser never
 * talks to Supabase tables, n8n webhooks or any third-party API directly.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseError(response: Response): Promise<never> {
  let message = `The request failed with status ${response.status}.`;
  let details: unknown;
  try {
    const body = (await response.json()) as { error?: string; details?: unknown };
    if (body.error) message = body.error;
    details = body.details;
  } catch {
    // Non-JSON error response; keep the generic message.
  }
  throw new ApiError(message, response.status, details);
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });
  if (!response.ok) await parseError(response);
  return (await response.json()) as T;
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function toQueryString(params: Record<string, string | number | boolean | string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" ) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      search.set(key, value.join(","));
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
