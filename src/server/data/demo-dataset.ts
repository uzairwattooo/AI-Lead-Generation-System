/**
 * Deterministic demo dataset.
 *
 * This file is the ONLY place in the application that contains fabricated
 * records. It exists so the interface can be previewed without Supabase or
 * n8n, and is never used when NEXT_PUBLIC_DEMO_MODE is off.
 */
import type {
  ActivityEvent,
  CallQueueEntry,
  Lead,
  LeadScoreBreakdown,
  LeadSearchRequest,
  MeetingRecord,
  OutreachRecord,
  ReplyRecord,
  WorkspaceSettings,
} from "@/types";

/** Small deterministic PRNG so demo data is identical on every render. */
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)] as T;
}

const BASE_TIME = Date.parse("2026-08-28T09:00:00.000Z");

function minutesAgo(minutes: number): string {
  return new Date(BASE_TIME - minutes * 60_000).toISOString();
}

const COMPANY_PREFIXES = [
  "Bluebell", "Northgate", "Riverstone", "Lakeview", "Cedarline", "Harborview",
  "Ironwood", "Silverpine", "Brightpath", "Summit", "Westbrook", "Copperfield",
  "Stonebridge", "Fairmount", "Greenway", "Oakridge", "Redwood", "Highfield",
  "Meridian", "Clearwater", "Ashford", "Ravenswood", "Windermere", "Baylane",
];

const COMPANY_SUFFIX_BY_CATEGORY: Record<string, string[]> = {
  Dentists: ["Dental Care", "Family Dentistry", "Dental Studio"],
  Hotels: ["Hotel", "Boutique Hotel", "Suites"],
  Salons: ["Hair Studio", "Beauty Lounge", "Salon"],
  Restaurants: ["Kitchen", "Bistro", "Grill House"],
  "Real-Estate Agencies": ["Realty", "Property Group", "Estates"],
  "Marketing Agencies": ["Marketing", "Media Group", "Growth Partners"],
  "Design Agencies": ["Design Co.", "Creative Studio", "Brand Studio"],
  "SaaS Companies": ["Software", "Labs", "Systems"],
  "E-Commerce Businesses": ["Supply Co.", "Store", "Goods"],
};

const CITY_BY_REGION: Record<string, string[]> = {
  Texas: ["Austin", "Dallas", "Houston", "San Antonio"],
  California: ["San Diego", "Sacramento", "San Jose", "Fresno"],
  England: ["Manchester", "Bristol", "Leeds", "Birmingham"],
  Ontario: ["Toronto", "Ottawa", "Hamilton", "London"],
};

const WEBSITE_ISSUES = [
  "Largest Contentful Paint above 4 seconds on mobile",
  "No mobile-responsive layout below 480px",
  "Missing meta description on key landing pages",
  "SSL certificate expires within 30 days",
  "Booking form returns a server error",
  "Uncompressed hero images over 2 MB",
  "No structured data for local business",
  "Site built on an unsupported CMS version",
];

const OPPORTUNITY_SIGNALS = [
  "Website last updated more than four years ago",
  "Currently hiring a frontend developer",
  "Running paid ads to a slow landing page",
  "Recently opened a second location",
  "Published a request for design partners",
  "Migrating from a legacy e-commerce platform",
  "No online booking despite phone-heavy workflow",
];

const DECISION_ROLES = ["Owner", "Managing Director", "Marketing Manager", "Head of Operations", "Founder"];
const FIRST_NAMES = ["Alex", "Jordan", "Priya", "Samir", "Marta", "Chris", "Noor", "Diego", "Hana", "Tomas"];
const LAST_NAMES = ["Bennett", "Okafor", "Nowak", "Ferreira", "Haddad", "Lindqvist", "Ramirez", "Kaur", "Whitfield", "Duval"];

function scoreBreakdown(random: () => number, total: number): LeadScoreBreakdown {
  const components = [
    { key: "website_quality", label: "Website quality gap", maxScore: 30 },
    { key: "contact_quality", label: "Contact data quality", maxScore: 25 },
    { key: "buying_signal", label: "Buying signal strength", maxScore: 25 },
    { key: "fit", label: "Service fit", maxScore: 20 },
  ];
  let remaining = total;
  const scored = components.map((component, index) => {
    const isLast = index === components.length - 1;
    const cap = Math.min(component.maxScore, remaining);
    const value = isLast ? cap : Math.round(cap * (0.55 + random() * 0.45));
    remaining -= value;
    return {
      ...component,
      score: value,
      rationale:
        component.key === "website_quality"
          ? "Derived from automated page checks"
          : component.key === "contact_quality"
            ? "Based on verified email and phone results"
            : component.key === "buying_signal"
              ? "Derived from public hiring and activity signals"
              : "Matched against the selected CodeNativeX service",
    };
  });
  return {
    total,
    potential: total >= 80 ? "high" : total >= 60 ? "medium" : "low",
    components: scored,
    calculatedAt: minutesAgo(120),
  };
}

export interface DemoDataset {
  requests: LeadSearchRequest[];
  leads: Lead[];
  outreach: OutreachRecord[];
  replies: ReplyRecord[];
  meetings: MeetingRecord[];
  callQueue: CallQueueEntry[];
  activity: ActivityEvent[];
  settings: WorkspaceSettings;
}

export function buildDemoDataset(): DemoDataset {
  const random = createRandom(20260828);

  const requests: LeadSearchRequest[] = [
    {
      id: "req_2f81a4",
      country: "United States",
      region: "Texas",
      city: "Austin",
      radiusKm: 30,
      categories: ["Dentists"],
      service: "Website Redesign",
      leadType: "Local Businesses",
      requestedLeadCount: 100,
      minimumScore: 70,
      requireEmail: true,
      requirePhone: true,
      requireDecisionMaker: false,
      excludedDomains: [],
      additionalInstructions: "Prioritise practices with outdated booking flows.",
      status: "completed",
      createdAt: minutesAgo(2880),
      startedAt: minutesAgo(2878),
      completedAt: minutesAgo(2831),
      createdBy: "demo@codenativex.com",
      leadsFound: 64,
      verifiedLeads: 48,
      highPotentialLeads: 19,
      errorMessage: null,
    },
    {
      id: "req_7c33be",
      country: "United Kingdom",
      region: "England",
      city: "Manchester",
      radiusKm: 25,
      categories: ["Marketing Agencies", "Design Agencies"],
      service: "White-Label Development Partnership",
      leadType: "White-Label Partners",
      requestedLeadCount: 60,
      minimumScore: 65,
      requireEmail: true,
      requirePhone: false,
      requireDecisionMaker: true,
      excludedDomains: ["competitor.com"],
      additionalInstructions: "",
      status: "needs_review",
      createdAt: minutesAgo(1440),
      startedAt: minutesAgo(1438),
      completedAt: minutesAgo(1402),
      createdBy: "demo@codenativex.com",
      leadsFound: 41,
      verifiedLeads: 27,
      highPotentialLeads: 8,
      errorMessage: null,
    },
    {
      id: "req_91dd05",
      country: "Canada",
      region: "Ontario",
      city: "Toronto",
      radiusKm: 40,
      categories: ["SaaS Companies"],
      service: "Frontend Development",
      leadType: "Companies Currently Hiring Developers",
      requestedLeadCount: 80,
      minimumScore: 75,
      requireEmail: true,
      requirePhone: false,
      requireDecisionMaker: true,
      excludedDomains: [],
      additionalInstructions: "Focus on teams hiring React engineers.",
      status: "running",
      createdAt: minutesAgo(9),
      startedAt: minutesAgo(8),
      completedAt: null,
      createdBy: "demo@codenativex.com",
      leadsFound: 23,
      verifiedLeads: 11,
      highPotentialLeads: 4,
      errorMessage: null,
    },
    {
      id: "req_4ab7f0",
      country: "Germany",
      region: "Bavaria",
      city: "Munich",
      radiusKm: 20,
      categories: ["Hotels"],
      service: "Performance Optimization",
      leadType: "Direct Clients",
      requestedLeadCount: 50,
      minimumScore: 70,
      requireEmail: true,
      requirePhone: true,
      requireDecisionMaker: false,
      excludedDomains: [],
      additionalInstructions: "",
      status: "failed",
      createdAt: minutesAgo(4320),
      startedAt: minutesAgo(4318),
      completedAt: minutesAgo(4311),
      createdBy: "demo@codenativex.com",
      leadsFound: 0,
      verifiedLeads: 0,
      highPotentialLeads: 0,
      errorMessage:
        "The business directory source rejected the request (rate limit reached). Retry the request or reduce the search radius.",
    },
  ];

  const leads: Lead[] = [];
  let leadIndex = 0;

  for (const request of requests) {
    if (request.status === "failed") continue;
    const count = request.id === "req_2f81a4" ? 26 : request.id === "req_7c33be" ? 16 : 10;
    for (let i = 0; i < count; i += 1) {
      leadIndex += 1;
      const category = pick(random, request.categories);
      const suffixes = COMPANY_SUFFIX_BY_CATEGORY[category] ?? ["Group"];
      const companyName = `${pick(random, COMPANY_PREFIXES)} ${pick(random, suffixes)}`;
      const city = pick(random, CITY_BY_REGION[request.region] ?? [request.city]);
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const score = Math.min(98, Math.max(38, Math.round(45 + random() * 55)));
      const hasEmail = random() > 0.12;
      const hasPhone = random() > 0.2;
      const hasWebsite = random() > 0.08;
      const verification: Lead["verificationStatus"] =
        !hasEmail && !hasPhone ? "invalid" : random() > 0.25 ? "verified" : random() > 0.5 ? "pending" : "unverified";
      const approval: Lead["approvalStatus"] =
        request.status === "running"
          ? "pending"
          : random() > 0.62
            ? "approved"
            : random() > 0.8
              ? "rejected"
              : "pending";
      const outreachStatus: Lead["outreachStatus"] =
        approval === "approved"
          ? pick(random, [
              "queued",
              "initial_email_sent",
              "follow_up_1",
              "follow_up_2",
              "replied",
              "interested",
              "meeting_booked",
              "needs_human_review",
            ] as const)
          : "not_queued";
      const firstName = pick(random, FIRST_NAMES);
      const lastName = pick(random, LAST_NAMES);
      const hasDecisionMaker = random() > 0.35;

      leads.push({
        id: `lead_${String(leadIndex).padStart(4, "0")}`,
        requestId: request.id,
        companyName,
        category,
        country: request.country,
        region: request.region,
        city,
        website: hasWebsite ? `https://www.${slug}.com` : null,
        websiteScreenshotUrl: null,
        email: hasEmail ? `hello@${slug}.com` : null,
        phone: hasPhone ? `+1 512 ${String(200 + Math.floor(random() * 700))} ${String(1000 + Math.floor(random() * 8999))}` : null,
        decisionMaker: hasDecisionMaker
          ? {
              name: `${firstName} ${lastName}`,
              role: pick(random, DECISION_ROLES),
              email: hasEmail ? `${firstName.toLowerCase()}@${slug}.com` : null,
              phone: null,
              profileUrl: null,
            }
          : null,
        opportunitySignals: [pick(random, OPPORTUNITY_SIGNALS), pick(random, OPPORTUNITY_SIGNALS)].filter(
          (value, index, all) => all.indexOf(value) === index,
        ),
        websiteIssues: hasWebsite
          ? [pick(random, WEBSITE_ISSUES), pick(random, WEBSITE_ISSUES)].filter(
              (value, index, all) => all.indexOf(value) === index,
            )
          : ["No website found for this business"],
        recommendedService: request.service,
        score,
        scoreBreakdown: scoreBreakdown(random, score),
        verificationStatus: verification,
        approvalStatus: approval,
        rejectionReason: approval === "rejected" ? "Website already modern" : null,
        outreachStatus,
        isPossibleDuplicate: random() > 0.92,
        duplicateOfLeadId: null,
        sourceLinks: [
          { label: "Business directory listing", url: `https://maps.example.com/place/${slug}`, retrievedAt: minutesAgo(300) },
          ...(hasWebsite
            ? [{ label: "Company website", url: `https://www.${slug}.com`, retrievedAt: minutesAgo(298) }]
            : []),
        ],
        verificationHistory: [
          {
            id: `ver_${leadIndex}_1`,
            field: "email",
            result: hasEmail ? "valid" : "unknown",
            provider: "SMTP probe",
            checkedAt: minutesAgo(280),
            detail: hasEmail ? "Mailbox accepted the probe" : "No public mailbox discovered",
          },
          {
            id: `ver_${leadIndex}_2`,
            field: "website",
            result: hasWebsite ? "valid" : "invalid",
            provider: "HTTP check",
            checkedAt: minutesAgo(279),
            detail: hasWebsite ? "Responded with 200 OK" : "No reachable website",
          },
        ],
        notes: [],
        discoveredAt: minutesAgo(300 - i),
      });
    }
  }

  const approvedLeads = leads.filter((lead) => lead.approvalStatus === "approved");

  const outreach: OutreachRecord[] = approvedLeads.map((lead, index) => ({
    id: `out_${String(index + 1).padStart(4, "0")}`,
    leadId: lead.id,
    companyName: lead.companyName,
    email: lead.email,
    status: lead.outreachStatus === "not_queued" ? "queued" : lead.outreachStatus,
    requiresApproval: index % 4 === 0,
    lastContactedAt: lead.outreachStatus === "queued" ? null : minutesAgo(200 - index),
    nextActionAt: minutesAgo(-(120 + index * 30)),
    updatedAt: minutesAgo(180 - index),
    messages: [
      {
        id: `msg_${index + 1}_initial`,
        step: "initial",
        subject: `A faster ${lead.category.toLowerCase()} website for ${lead.companyName}`,
        body:
          `Hello ${lead.decisionMaker?.name ?? "there"},\n\n` +
          `While reviewing ${lead.category.toLowerCase()} businesses in ${lead.city ?? lead.country}, we noticed ` +
          `${lead.websiteIssues[0]?.toLowerCase() ?? "a few issues on your current site"}.\n\n` +
          `CodeNativeX builds fast, accessible websites for businesses like yours. Would you be open to a short call ` +
          `to walk through what we found?\n\nBest regards,\nThe CodeNativeX team`,
        status: index % 4 === 0 ? "awaiting_approval" : "sent",
        sentAt: index % 4 === 0 ? null : minutesAgo(200 - index),
      },
    ],
  }));

  const repliedOutreach = outreach.filter((record) =>
    ["replied", "interested", "meeting_booked", "needs_human_review"].includes(record.status),
  );

  const replies: ReplyRecord[] = repliedOutreach.map((record, index) => {
    const classification = pick(random, [
      "interested",
      "pricing_question",
      "meeting_request",
      "not_interested",
      "do_not_contact",
      "unclear",
    ] as const);
    return {
      id: `rep_${String(index + 1).padStart(4, "0")}`,
      leadId: record.leadId,
      outreachId: record.id,
      companyName: record.companyName,
      fromEmail: record.email ?? "unknown@example.com",
      subject: `Re: A faster website for ${record.companyName}`,
      body:
        classification === "pricing_question"
          ? "Thanks for reaching out. What would a redesign like this typically cost?"
          : classification === "meeting_request"
            ? "This looks useful. Could we speak on Thursday afternoon?"
            : classification === "interested"
              ? "Interesting timing, we were just discussing this internally. Please send more detail."
              : classification === "not_interested"
                ? "We are happy with our current setup, but thank you."
                : classification === "do_not_contact"
                  ? "Please remove this address from your list."
                  : "Forwarding to my colleague.",
      classification,
      confidence: Math.round((0.62 + random() * 0.35) * 100) / 100,
      requiresHumanReview: classification === "unclear",
      handled: random() > 0.6,
      receivedAt: minutesAgo(150 - index * 3),
    };
  });

  const meetings: MeetingRecord[] = outreach
    .filter((record) => record.status === "meeting_booked")
    .map((record, index) => {
      const lead = leads.find((item) => item.id === record.leadId);
      return {
        id: `mtg_${String(index + 1).padStart(4, "0")}`,
        leadId: record.leadId,
        companyName: record.companyName,
        contactName: lead?.decisionMaker?.name ?? null,
        contactEmail: record.email,
        status: index === 0 ? "completed" : index === 1 ? "requested" : "scheduled",
        scheduledFor: minutesAgo(-(1440 + index * 720)),
        durationMinutes: 30,
        meetingUrl: "https://meet.example.com/codenativex-intro",
        notes: null,
        createdAt: minutesAgo(400 - index * 20),
      };
    });

  const callQueue: CallQueueEntry[] = outreach
    .filter((record) => record.status === "calling_queue" || record.status === "needs_human_review")
    .slice(0, 6)
    .map((record, index) => {
      const lead = leads.find((item) => item.id === record.leadId);
      return {
        id: `call_${String(index + 1).padStart(4, "0")}`,
        leadId: record.leadId,
        companyName: record.companyName,
        phone: lead?.phone ?? null,
        reason:
          record.status === "needs_human_review"
            ? "Reply could not be classified automatically"
            : "No email reply after the final follow-up",
        priority: index === 0 ? "high" : index < 3 ? "normal" : "low",
        queuedAt: minutesAgo(120 - index * 10),
      };
    });

  const activity: ActivityEvent[] = [
    {
      id: "act_0001",
      requestId: "req_91dd05",
      leadId: null,
      actor: "opportunity_hunter",
      action: "stage_started",
      message: "Validating emails and phone numbers for 23 discovered businesses.",
      severity: "info",
      createdAt: minutesAgo(3),
    },
    {
      id: "act_0002",
      requestId: "req_91dd05",
      leadId: null,
      actor: "opportunity_hunter",
      action: "duplicates_removed",
      message: "Removed 4 duplicate businesses already present in the database.",
      severity: "info",
      createdAt: minutesAgo(5),
    },
    {
      id: "act_0003",
      requestId: "req_7c33be",
      leadId: null,
      actor: "opportunity_hunter",
      action: "needs_review",
      message: "14 leads are missing a decision maker although the request required one.",
      severity: "warning",
      createdAt: minutesAgo(1402),
    },
    {
      id: "act_0004",
      requestId: "req_4ab7f0",
      leadId: null,
      actor: "opportunity_hunter",
      action: "request_failed",
      message: "Business directory source rejected the request (rate limit reached).",
      severity: "error",
      createdAt: minutesAgo(4311),
    },
    {
      id: "act_0005",
      requestId: null,
      leadId: null,
      actor: "outreach_agent",
      action: "emails_sent",
      message: "Sent 18 initial emails from the approved outreach queue.",
      severity: "success",
      createdAt: minutesAgo(240),
    },
    {
      id: "act_0006",
      requestId: null,
      leadId: null,
      actor: "outreach_agent",
      action: "reply_unclear",
      message: "A reply could not be classified with confidence and needs human review.",
      severity: "warning",
      createdAt: minutesAgo(150),
    },
    {
      id: "act_0007",
      requestId: "req_2f81a4",
      leadId: null,
      actor: "opportunity_hunter",
      action: "request_completed",
      message: "Saved 48 verified leads, 19 of them high potential.",
      severity: "success",
      createdAt: minutesAgo(2831),
    },
  ];

  const settings: WorkspaceSettings = {
    autoApproveLeads: false,
    minimumApprovalScore: 70,
    requireEmailBeforeOutreach: true,
    requireOutreachCopyApproval: true,
    dailyOutreachLimit: 120,
    followUpCount: 3,
    followUpIntervalDays: 4,
    notifyOnNeedsReview: true,
    senderName: "CodeNativeX Team",
    senderEmail: "hello@codenativex.com",
  };

  return { requests, leads, outreach, replies, meetings, callQueue, activity, settings };
}
