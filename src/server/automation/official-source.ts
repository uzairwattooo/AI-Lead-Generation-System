import "server-only";
import { assertPublicHttpUrl } from "@/server/audits/audit-engine";
import { officialUrl, readOfficialPage, verifyOfficialEvidence, type OfficialPage } from "@/lib/automation/source-evidence";
import type { ProspectInput } from "@/lib/automation/policy";

export async function fetchOfficialPage(value: string, website: string, signal: AbortSignal): Promise<OfficialPage> {
  const initialUrl = officialUrl(value, website);
  if (!initialUrl) throw new Error("Use a public HTTPS page on the official business domain.");
  let url: string = initialUrl;
  for (let redirects = 0; redirects < 4; redirects++) {
    signal.throwIfAborted();
    await assertPublicHttpUrl(url);
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.any([signal, AbortSignal.timeout(7000)]), headers: { accept: "text/html,text/plain" } });
    if ([301,302,303,307,308].includes(response.status)) {
      const destination = response.headers.get("location");
      const next = destination ? officialUrl(destination, url) : null;
      if (!next || !officialUrl(next, website)) throw new Error("Official source redirected outside the approved business domain.");
      url = next;
      continue;
    }
    if (!response.ok) throw new Error(`Official source returned HTTP ${response.status}.`);
    if (!/^(text\/(html|plain)|application\/xhtml\+xml)/i.test(response.headers.get("content-type") || "")) throw new Error("Official source is not a readable web page.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Official source returned no readable content.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.byteLength;
        if (size > 700_000) throw new Error("Official page exceeded the verification size limit.");
        chunks.push(item.value);
      }
    } finally { await reader.cancel().catch(() => undefined); }
    return { url, html: Buffer.concat(chunks).toString("utf8") };
  }
  throw new Error("Official source redirected too many times.");
}

export async function collectOfficialEvidence(
  input: ProspectInput,
  fetchPage: typeof fetchOfficialPage = fetchOfficialPage,
) {
  const signal = AbortSignal.timeout(35000);
  const root = new URL("/", input.website).href;
  const queue = [...new Set([officialUrl(input.source_url, input.website), officialUrl(root, input.website)].filter((u): u is string => Boolean(u)))];
  const seen = new Set<string>();
  const pages: OfficialPage[] = [];
  const failures: string[] = [];
  // At most five official pages; no paid model calls or unrestricted crawling.
  while (queue.length && seen.size < 5 && !signal.aborted) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    try {
      const page = await fetchPage(url, input.website, signal);
      pages.push(page);
      const parsed = readOfficialPage(page, input.website);
      for (const link of parsed?.contactLinks || []) if (!seen.has(link) && !queue.includes(link)) queue.push(link);
      const result = verifyOfficialEvidence(input, pages);
      if (result.verified && result.email) return result;
    } catch { failures.push(url); }
    if (!queue.length) for (const path of ["/contact-us/", "/contact/", "/about/"]) {
      const next = officialUrl(path, root);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  const result = verifyOfficialEvidence(input, pages);
  return { ...result, reason: result.reason + (failures.length ? ` ${failures.length} official page(s) could not be fetched.` : "") };
}
