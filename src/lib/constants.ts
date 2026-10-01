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
  "Digital Agencies",
  "Web Development Agencies",
  "SEO Agencies",
  "Creative Agencies",
  "Software Companies",
  "Marketing Agencies",
  "Design Agencies",
  "SaaS Companies",
  "E-Commerce Businesses",
] as const;

export const SERVICES = [
  "Web Development",
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

export const DISCOVERY_SOURCES = [
  { value: "google_maps", label: "Local businesses in an area" },
  { value: "linkedin_public_search", label: "Businesses posting requirements on LinkedIn" },
  { value: "job_platform_public_search", label: "Public client projects" },
  { value: "agency_collaboration_public_search", label: "Agency and white-label partners" },
  { value: "google_intent_public_search", label: "Businesses actively looking for help" },
] as const;

export type DiscoverySourceValue = (typeof DISCOVERY_SOURCES)[number]["value"];
type LeadType = (typeof LEAD_TYPES)[number];
type Service = (typeof SERVICES)[number];

interface DiscoverySourceRule {
  leadTypes: readonly LeadType[];
  services: readonly Service[];
  defaultLeadType: LeadType;
  defaultService: Service;
  guidance: string;
}

/**
 * Allowed request combinations for each discovery worker. The same rules are
 * used by the form and server validation so an invalid combination cannot be
 * submitted by bypassing the UI.
 */
export const DISCOVERY_SOURCE_RULES: Record<DiscoverySourceValue, DiscoverySourceRule> = {
  google_maps: {
    leadTypes: ["Local Businesses", "Direct Clients", "Marketing or Design Agencies"],
    services: ["New Website", "Website Redesign", "SEO Improvement", "Performance Optimization"],
    defaultLeadType: "Local Businesses",
    defaultService: "Website Redesign",
    guidance: "Best for location-based businesses and agencies with a public business listing.",
  },
  linkedin_public_search: {
    leadTypes: [
      "Direct Clients",
      "Marketing or Design Agencies",
      "White-Label Partners",
      "SaaS Companies",
      "Companies Currently Hiring Developers",
      "Businesses Posting Collaboration Opportunities",
    ],
    services: [
      "Web Development",
      "New Website",
      "Website Redesign",
      "Frontend Development",
      "MVP Development",
      "SEO Improvement",
      "Performance Optimization",
      "White-Label Development Partnership",
    ],
    defaultLeadType: "Direct Clients",
    defaultService: "Website Redesign",
    guidance: "Find public buyer requests for website services. Employment listings are excluded.",
  },
  job_platform_public_search: {
    leadTypes: ["Direct Clients", "Businesses Posting Collaboration Opportunities"],
    services: [
      "Web Development",
      "New Website",
      "Website Redesign",
      "Frontend Development",
      "MVP Development",
      "SEO Improvement",
      "Performance Optimization",
    ],
    defaultLeadType: "Direct Clients",
    defaultService: "New Website",
    guidance: "Best for public client projects rather than permanent employment listings.",
  },
  agency_collaboration_public_search: {
    leadTypes: [
      "Marketing or Design Agencies",
      "White-Label Partners",
      "Businesses Posting Collaboration Opportunities",
    ],
    services: [
      "Web Development",
      "Frontend Development",
      "MVP Development",
      "Website Redesign",
      "White-Label Development Partnership",
    ],
    defaultLeadType: "White-Label Partners",
    defaultService: "White-Label Development Partnership",
    guidance: "Best for agencies seeking white-label, overflow or long-term delivery partners.",
  },
  google_intent_public_search: {
    leadTypes: [
      "Direct Clients",
      "Marketing or Design Agencies",
      "SaaS Companies",
      "Companies Currently Hiring Developers",
      "Businesses Posting Collaboration Opportunities",
    ],
    services: [
      "Web Development",
      "New Website",
      "Website Redesign",
      "Frontend Development",
      "MVP Development",
      "SEO Improvement",
      "Performance Optimization",
      "White-Label Development Partnership",
    ],
    defaultLeadType: "Direct Clients",
    defaultService: "Website Redesign",
    guidance: "Best for public pages that show an active website, software or partnership requirement.",
  },
};

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

export const PROGRESS_STAGE_LABELS: Record<ProgressStageKey, string> = {
  request_queued: "Request queued",
  lead_discovery: "Lead discovery",
  website_verification: "Website verification",
  lead_intake_cleaning: "Lead intake and data cleaning",
  lead_research_scoring: "Lead research and scoring",
  personalized_outreach: "Personalized email outreach",
  reply_monitoring: "Reply monitoring and follow-up",
  meeting_booking: "Meeting booking and sales handoff",
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
  email_draft_ready: "Email draft ready",
  awaiting_approval: "Awaiting approval",
  queued: "Queued",
  awaiting_reply: "Awaiting reply",
  outreach_failed: "Send failed",
  outreach_blocked: "Blocked",
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
