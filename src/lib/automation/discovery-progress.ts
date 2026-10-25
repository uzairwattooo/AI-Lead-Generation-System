export type DiscoveryDiagnostic = {
  name: string;
  outcome: "saved" | "needs_review" | "duplicate" | "invalid" | "save_failed";
  reason: string;
  sourceUrl?: string;
  opportunityId?: string;
};
export type DiscoveryJob = {
  id: string; category: string; city: string; region?: string; country?: string;
  kind: string; status: string; result_count: number; error: string | null;
  stage?: string; progress_percent?: number; found_count?: number; processed_count?: number;
  review_count?: number; verified_count?: number; duplicate_count?: number;
  diagnostics?: DiscoveryDiagnostic[]; updated_at?: string; run_id?: string | null;
};
export function citationKey(value: string): string {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()])
      if (/^utm_|^(gclid|fbclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return url.hostname.toLowerCase().replace(/^www\./, "") + url.pathname.replace(/\/$/, "") + url.search;
  } catch { return ""; }
}
function locationKey(value: string): string {
  const key = value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const aliases: Record<string,string> = { "nyc":"new york", "new york city":"new york", "usa":"united states", "us":"united states", "uk":"united kingdom", "uae":"united arab emirates" };
  return aliases[key] || key;
}
export function discoveryLocationMatches(found: {city:string;country:string}, requested: {city:string;country:string}): boolean {
  return locationKey(found.city) === locationKey(requested.city) && locationKey(found.country) === locationKey(requested.country);
}
/** Ignore unknown model keys; never invent missing business fields. */
export function discoveryCandidate(value: unknown): Record<string,unknown> {
  const v = value && typeof value === "object" ? value as Record<string,unknown> : {};
  return Object.fromEntries(["company_name","category","city","country","website","source_url","excerpt","email"].map(key => [key,key === "email" && (v[key] === "" || v[key] === undefined) ? null : v[key]]));
}
