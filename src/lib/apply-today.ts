export const stages = ["shortlisted", "applied", "reply", "call", "paid", "rejected"] as const;
export type Stage = typeof stages[number];

export function safeProjectUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
