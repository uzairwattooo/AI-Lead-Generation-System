import { z } from "zod";
export const searchSchema = z
  .object({
    category: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(100),
    country: z.string().trim().min(2).max(100),
    kind: z.enum(["business", "buyer_request"]).default("business"),
    limit: z.number().int().min(1).max(10).default(5),
  })
  .strict();
export const publicUrl = z
  .string()
  .url()
  .max(2000)
  .refine((s) => {
    try {
      const u = new URL(s);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use a public HTTPS URL");
export const prospectSchema = z
  .object({
    company_name: z.string().trim().min(2).max(160),
    category: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(100),
    country: z.string().trim().min(2).max(100),
    website: publicUrl,
    source_url: publicUrl,
    excerpt: z.string().trim().min(30).max(600),
    email: z.string().trim().email().max(254).nullable().default(null),
  })
  .strict();
export type ProspectInput = z.infer<typeof prospectSchema>;
export type Signal = { label: string; excerpt: string };
export function canonicalHost(value: string) {
  return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
}
export function normal(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function assess(input: ProspectInput, text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const observed: Signal[] = [];
  const excerptFound = normal(clean).includes(normal(input.excerpt));
  const identity =
    normal(input.company_name).length > 2 &&
    normal(clean).includes(normal(input.company_name));
  const firstParty =
    canonicalHost(input.website) === canonicalHost(input.source_url) &&
    !/(^|\.)(facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|yelp\.com|google\.com)$/.test(
      canonicalHost(input.website),
    );
  const verified = excerptFound && identity && firstParty;
  const patterns: [string, RegExp][] = [
    ["WhatsApp contact channel", /whatsapp|wa\.me/i],
    [
      "Appointment or viewing enquiries",
      /book.{0,25}(appointment|viewing|consultation)|schedule.{0,25}(viewing|appointment|consultation)/i,
    ],
    ["Property enquiries", /property|real estate|homes for sale|realtor/i],
    [
      "Online sales enquiries",
      /shop online|add to cart|product enquiry|order online/i,
    ],
    ["Social contact channel", /instagram|facebook|tiktok/i],
    [
      "Customer enquiry channel",
      /contact us|request a quote|send (?:us )?a message/i,
    ],
  ];
  if (verified)
    for (const [label, pattern] of patterns) {
      const m = pattern.exec(clean);
      if (m)
        observed.push({
          label,
          excerpt: clean.slice(Math.max(0, m.index - 50), m.index + 130),
        });
    }
  const publishedEmails = new Set(
    (
      clean.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ||
      []
    ).map((e) => e.toLowerCase()),
  );
  const email =
    input.email && publishedEmails.has(input.email.toLowerCase()) && verified
      ? input.email.toLowerCase()
      : null;
  const capabilities = [
    "Shared enquiry dashboard",
    "Lead qualification and follow-up",
    "Meeting or viewing booking",
  ];
  if (observed.some((s) => s.label === "WhatsApp contact channel"))
    capabilities.unshift("WhatsApp enquiry assistant");
  if (observed.some((s) => s.label === "Social contact channel"))
    capabilities.push("Connected social inbox replies");
  return {
    verified,
    email,
    signals: observed,
    score: verified ? Math.min(90, 30 + observed.length * 12) : 0,
    capabilities,
    reason: verified
      ? "Observed channels suggest a potential automation fit. Message volume and willingness to buy are not verified."
      : "Source identity or excerpt could not be verified. Manual review required.",
  };
}
export function initialDraft(
  name: string,
  category: string,
  signals: Signal[],
) {
  const greeting = `Hi ${name.replace(/[\r\n]/g, " ").slice(0, 100)} team,`;
  const property = /real.?estate|property/i.test(category);
  const offer = property
    ? "property enquiries and viewing bookings"
    : "customer enquiries and meeting bookings";
  const channel = signals.some((s) => s.label === "WhatsApp contact channel")
    ? "WhatsApp and other connected inboxes"
    : "your connected business inboxes";
  return {
    subject: `An AI assistant for ${name}`.slice(0, 150),
    body: `${greeting}\n\nWe build AI assistants that help businesses manage ${offer} from one professional dashboard.\n\nYour assistant could reply through ${channel}, qualify new leads, follow up and help arrange appointments, with your team staying in control. Where supported, it can also flag relevant public buying requests in your target area for review.\n\nWould you be open to a short call to see what would be useful for your business?\n\nBest regards,\nCode Nativex\ncodenativex.com\n\nIf this is not relevant, reply "not interested" and we will not follow up.`,
  };
}
export function replyIntent(text: string): "stop" | "interested" | "review" {
  const latest = (text.split(/\n(?:On .{0,150}wrote:|From:|>)/i)[0] || "")
    .trim()
    .toLowerCase();
  if (
    /unsubscribe|remove me|stop (?:emailing|contacting)|do not contact|not interested|no thanks|don't contact/.test(
      latest,
    )
  )
    return "stop";
  if (
    latest.length < 1200 &&
    /^(yes|sure|sounds good|interested|let'?s (talk|meet)|please (send|share)|ok\b)|\b(book|schedule) (a )?(call|meeting)\b/.test(
      latest,
    )
  )
    return "interested";
  return "review";
}
export function safeError(error: unknown) {
  return String(error instanceof Error ? error.message : error)
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .slice(0, 600);
}
