/** Compare homepage targets without rejecting the optional www hostname prefix.
 * Keep protocol, port, path, query and fragment checks so another page/site cannot
 * reuse an approved concept. No network requests or redirect following here.
 */
export function sameConceptWebsite(captured: unknown, current: unknown): boolean {
  if (typeof captured !== "string" || typeof current !== "string") return false;
  const normalize = (value: string): string | null => {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
      url.hostname = url.hostname.replace(/^www\./i, "");
      return url.href;
    } catch { return null; }
  };
  const left = normalize(captured);
  return left !== null && left === normalize(current);
}
