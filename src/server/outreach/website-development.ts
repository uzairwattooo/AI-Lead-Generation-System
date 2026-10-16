/** Missing URL is different from an existing URL that failed to load. */
export function websiteMissing(value: unknown): boolean {
  return value === null || value === undefined || typeof value === "string" && value.trim() === "";
}
export function websiteDevelopmentEmail(company: string, city?: string | null, firstName?: string | null) {
  return {
    subject: `A website idea for ${company}`,
    body: `Hi ${firstName || `${company} team`},\n\nI came across ${company}${city ? ` in ${city}` : ""} and couldn't find an official website in the business details available to me.\n\nA clear, easy-to-use website could give customers one place to explore your services, find your opening hours and get in touch. We can help create a professional site tailored to your business and the way your customers contact you.\n\nWould you like me to share a few ideas for your homepage and the pages that could be useful? No cost or obligation.`,
    finding_codes: [] as string[],
  };
}
export function developmentOutreachBlock(lead: Record<string, unknown>): string | null {
  if (lead.approval_status !== "approved") return "Approve this lead before preparing outreach.";
  if (lead.do_not_contact === true || lead.dashboard_deleted_at) return "This lead cannot be contacted.";
  if (Number(lead.duplicate_count || 0) > 0 || /duplicate|rejected/i.test(String(lead.status || ""))) return "Duplicate or rejected lead cannot be contacted.";
  if (lead.gmail_message_id || lead.first_outreach_at || lead.outreach_status === "sending") return "This lead has already been contacted or is sending.";
  const email = String(lead.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^(email|test|example|yourname|user)@|@(example\.(com|org)|email\.com)$/i.test(email)) return "A real, syntax-valid email address is required. Use Find public contacts.";
  if (!["syntax_valid","deliverable","verified","valid"].includes(String(lead.email_validation_status || "").toLowerCase())) return "Validate this email address before preparing outreach.";
  return null;
}
