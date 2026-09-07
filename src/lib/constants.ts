import type {
  LeadRequestStatus,
  OutreachStatus,
  ProgressStageKey,
  ReplyClassification,
  MeetingStatus,
  VerificationStatus,
  ApprovalStatus,
} from "@/types";

export const BUSINESS_CATEGORIES = [
  "Hotels",
  "Salons",
  "Dentists",
  "Restaurants",
  "Real-Estate Agencies",
  "Marketing Agencies",
  "Design Agencies",
  "SaaS Companies",
  "E-Commerce Businesses",
] as const;

export const SERVICES = [
  "New Website",
  "Website Redesign",
  "Frontend Development",
  "MVP Development",
  "SEO Improvement",
  "Performance Optimization",
  "White-Label Development Partnership",
] as const;

export const LEAD_TYPES = [
  "Local Businesses",
  "Direct Clients",
  "Marketing or Design Agencies",
  "White-Label Partners",
  "SaaS Companies",
  "Companies Currently Hiring Developers",
  "Businesses Posting Collaboration Opportunities",
] as const;

export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Ireland",
  "Germany",
  "Netherlands",
  "France",
  "Spain",
  "Italy",
  "Sweden",
  "Norway",
  "Denmark",
  "United Arab Emirates",
  "Saudi Arabia",
  "Australia",
  "New Zealand",
  "Singapore",
  "Pakistan",
  "India",
] as const;

/** Optional region hints. Free text is always accepted for unlisted countries. */
export const REGIONS_BY_COUNTRY: Record<string, readonly string[]> = {
  "United States": ["California", "Texas", "New York", "Florida", "Illinois", "Washington", "Colorado", "Georgia"],
  Canada: ["Ontario", "Quebec", "British Columbia", "Alberta"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Germany: ["Bavaria", "Berlin", "Hesse", "North Rhine-Westphalia"],
  Australia: ["New South Wales", "Victoria", "Queensland", "Western Australia"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah"],
  Pakistan: ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Islamabad Capital Territory"],
  India: ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu"],
};

export const PROGRESS_STAGE_LABELS: Record<ProgressStageKey, string> = {
  request_queued: "Request queued",
  searching_sources: "Searching business sources",
  collecting_business_info: "Collecting business information",
  checking_websites: "Checking websites",
  finding_contacts: "Finding public contact details",
  validating_contacts: "Validating emails and phone numbers",
  removing_duplicates: "Removing duplicates",
  calculating_scores: "Calculating lead scores",
  saving_leads: "Saving verified leads",
  finished: "Completed or needs review",
};

export const REQUEST_STATUS_LABELS: Record<LeadRequestStatus, string> = {
  queued: "Queued",
  running: "Running",
  searching: "Searching",
  enriching: "Enriching",
  validating: "Validating",
  deduplicating: "Deduplicating",
  scoring: "Scoring",
  completed: "Completed",
  needs_review: "Needs review",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  not_queued: "Not queued",
  queued: "Queued",
  initial_email_sent: "Initial email sent",
  follow_up_1: "Follow-up 1",
  follow_up_2: "Follow-up 2",
  follow_up_3: "Follow-up 3",
  replied: "Replied",
  interested: "Interested",
  not_interested: "Not interested",
  do_not_contact: "Do not contact",
  calling_queue: "Calling queue",
  meeting_booked: "Meeting booked",
  needs_human_review: "Needs human review",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  pending: "Pending",
  verified: "Verified",
  invalid: "Invalid",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

export const REPLY_CLASSIFICATION_LABELS: Record<ReplyClassification, string> = {
  interested: "Interested",
  pricing_question: "Pricing question",
  meeting_request: "Meeting request",
  not_interested: "Not interested",
  do_not_contact: "Do not contact",
  unclear: "Unclear - needs review",
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  completed: "Completed",
  no_show: "No show",
  cancelled: "Cancelled",
};

export const REJECTION_REASONS = [
  "Not a fit for our services",
  "Website already modern",
  "Company too large",
  "Company too small",
  "Missing or unreliable contact details",
  "Duplicate of an existing lead",
  "Outside target market",
  "Other",
] as const;

export const TERMINAL_REQUEST_STATUSES: readonly LeadRequestStatus[] = [
  "completed",
  "needs_review",
  "failed",
  "cancelled",
];
