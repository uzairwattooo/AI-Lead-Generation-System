import { load } from "cheerio";
import { assess, canonicalHost, normal, type ProspectInput } from "./policy";
import { isOnlineStoreSearch, isStoreOpportunity } from "./store-focus";

export type OfficialPage = { url: string; html: string };
const emailPattern = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const excludedHost = /(^|\.)(facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|google\.com|yelp\.com)$/i;

export function officialUrl(value: string, website: string): string | null {
  try {
    const u = new URL(value, website);
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
    if (canonicalHost(u.href) !== canonicalHost(website) || excludedHost.test(u.hostname)) return null;
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) if (/^utm_|^(gclid|fbclid)$/i.test(key)) u.searchParams.delete(key);
    return u.href;
  } catch { return null; }
}

export function readOfficialPage(page: OfficialPage, website: string) {
  if (!officialUrl(page.url, website)) return null;
  const $ = load(page.html);
  $("script,style,noscript,template,svg,[hidden],[aria-hidden='true']").remove();
  // Keep boundaries between DOM elements; inline markup must not merge words.
  $("br").replaceWith(" ");
  $("p,div,li,section,footer,header,h1,h2,h3,td,a").append(" ");
  const links = $("a[href]").map((_, el) => $(el).attr("href") || "").get();
  const publishedLinks = links.filter(h => /^(mailto:|https?:\/\/(?:wa\.me|api\.whatsapp\.com|(?:www\.)?(?:instagram|facebook|tiktok)\.com))/i.test(h));
  const text = ($.text() + " " + publishedLinks.map(h => h.replace(/^mailto:/i, "").split("?")[0]).join(" ")).replace(/\s+/g, " ").trim();
  if (text.length < 30 || (text.length < 1200 && /checking your browser|verify you are human|request is being verified|just a moment|access denied|captcha/i.test(text))) return null;
  const contacts = [...new Set((text.match(emailPattern) || []).map(e => e.toLowerCase()))];
  const contactLinks = links.filter(h => /contact|support|help|about/i.test(h)).map(h => officialUrl(h, page.url)).filter((u): u is string => Boolean(u));
  return { url: page.url, text, contacts, contactLinks };
}

export function verifyOfficialEvidence(input: ProspectInput, pages: OfficialPage[]) {
  const documents = pages.map(p => readOfficialPage(p, input.website)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const text = documents.map(p => p.text).join(" ");
  const identity = normal(input.company_name).length > 2 && normal(text).includes(normal(input.company_name));
  const city = ` ${normal(text)} `.includes(` ${normal(input.city)} `);
  const published = [...new Set(documents.flatMap(p => p.contacts))];
  const host = canonicalHost(input.website);
  // Never guess an address or select a developer/third-party address from a footer.
  const contacts = published.filter(email => email.split("@")[1] === host && !/^(no[.-]?reply|donotreply|example|test)@/i.test(email));
  contacts.sort((a,b) => Number(!/^(support|info|contact|hello|sales)@/.test(a)) - Number(!/^(support|info|contact|hello|sales)@/.test(b)) || a.localeCompare(b));
  const email = input.email && contacts.includes(input.email.toLowerCase()) ? input.email.toLowerCase() : contacts[0] || null;
  const primary = documents.find(p => email && p.contacts.includes(email)) || documents.find(p => normal(p.text).includes(normal(input.company_name))) || documents[0];
  const anchor = primary ? Math.max(0, email ? primary.text.toLowerCase().indexOf(email) - 180 : 0) : 0;
  const excerpt = primary?.text.slice(anchor, anchor + 600) || "";
  const candidate = { ...input, email, excerpt, source_url: primary?.url || input.source_url };
  const result = assess(candidate, text);
  const store = !isOnlineStoreSearch(input.category) || isStoreOpportunity(result.signals);
  const verified = identity && city && result.verified && store;
  const reasons: string[] = [];
  if (!documents.length) reasons.push("Official pages could not be read (blocked, empty or unavailable). Contact remains unverified.");
  else {
    if (!identity) reasons.push("Business identity was not confirmed in the official page text.");
    if (!city) reasons.push("The requested city was not confirmed on the official pages.");
    if (!store) reasons.push("Online-sales plus customer-contact evidence is incomplete.");
    if (!email) reasons.push("No suitable published email on the business's own domain was found. External email addresses need manual contact review.");
  }
  return {
    verified, email: verified ? email : null, excerpt, source_url: candidate.source_url,
    signals: verified ? result.signals : [], capabilities: result.capabilities, score: verified ? result.score : 0,
    reason: reasons.length ? reasons.join(" ") : `Official business identity, city and published email checked across ${documents.length} page(s). Potential automation fit only; enquiry volume and buying interest are unconfirmed.`,
    pages: documents.map(p => p.url),
  };
}
