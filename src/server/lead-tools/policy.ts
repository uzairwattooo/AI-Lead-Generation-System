import { z } from "zod";
export const contactCandidateSchema = z.object({
  name: z.string().max(180).default(""), role: z.string().max(180).default(""),
  email: z.string().max(250).default(""), phone: z.string().max(80).default(""),
  sourceUrl: z.string().url().refine(value=>/^https?:\/\//i.test(value), "Use a public HTTP source"), evidence: z.string().min(10).max(2000),
  companyMatch: z.boolean(),
});
export type ContactCandidate = z.infer<typeof contactCandidateSchema> & { confirmed: boolean };
export function usableEmail(value: string): boolean {
  return z.string().email().safeParse(value).success && !/^(email|test|example|yourname|user)@|@(example\.(com|org)|email\.com)$/i.test(value);
}
export function verifyPublishedContact(candidate: z.infer<typeof contactCandidateSchema>, pageText: string): boolean {
  if (!candidate.companyMatch || (!candidate.email && !candidate.phone)) return false;
  const text = pageText.toLowerCase();
  const emailFound = !candidate.email || usableEmail(candidate.email) && text.includes(candidate.email.toLowerCase());
  const digits = candidate.phone.replace(/\D/g, "");
  const phoneFound = !candidate.phone || digits.length >= 8 && new RegExp(digits.split("").join("[^0-9]{0,4}")).test(pageText);
  return emailFound && phoneFound;
}
export function conceptEmail(company: string, firstName?: string | null): { subject: string; body: string } {
  return { subject: `A homepage concept for ${company}`, body: `Hi ${firstName || `${company} team`},\n\nI took a look at your website and prepared a homepage design concept for your business. The attached image compares your current homepage with a proposed direction for a clearer layout, more consistent spacing and a more prominent enquiry button.\n\nThis is a visual proposal, rather than a completed website update. We could also review mobile usability and technical improvements before agreeing on the final scope.\n\nWould you be open to sharing your thoughts on this direction? I'd be happy to discuss what would suit your business.` };
}
