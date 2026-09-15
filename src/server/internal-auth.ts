import "server-only";

import { timingSafeEqual } from "node:crypto";
import { apiError } from "@/server/api";
import { serverEnv } from "@/server/env";

export function requireN8nSecret(request: Request) {
  const expected = serverEnv.n8nWebhookSecret;
  const supplied = request.headers.get("x-codenativex-intake-key") ?? "";
  if (!expected || !supplied) return apiError("Internal workflow authentication is required.", 401);
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return apiError("Internal workflow authentication failed.", 403);
  }
  return null;
}
