import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardCheck,
  Database,
  FileCheck2,
  Gauge,
  Lock,
  MailCheck,
  Radar,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

/*
 * Responsive scale used by every section on this page
 * -------------------------------------------------------------------------
 * SECTION   vertical rhythm, one step per breakpoint
 * CONTAINER page gutter + max width, identical everywhere so every section's
 *           left edge lines up from mobile through desktop
 * HEADING   space between a section heading block and its content
 *
 * Nothing on this page sets its own padding; sections compose these three.
 */
const SECTION = "py-12 sm:py-16 lg:py-20";
const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
const HEADING_GAP = "mt-8 sm:mt-10";

const FEATURES = [
  {
    icon: Radar,
    title: "Intelligent Lead Discovery",
    body:
      "The Opportunity Hunter Agent searches public business sources using the country, region, category, radius and lead type you select, then analyses each business for signals that it needs development work.",
    points: [
      "Filter by location, radius and business category",
      "Target local businesses, agencies, SaaS teams or white-label partners",
      "Every run is scoped by the criteria you define",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Verified Business Data",
    body:
      "Discovered businesses are enriched from public sources, checked for reachable websites, validated for email and phone accuracy, de-duplicated against your existing database and scored before anything reaches your team.",
    points: [
      "Email and phone validation with a recorded result",
      "Duplicate removal against previously saved leads",
      "Transparent score breakdown for every lead",
    ],
  },
  {
    icon: MailCheck,
    title: "Automated Outreach",
    body:
      "Only leads you approve are handed to the Outreach Agent. It writes personalised emails, schedules follow-ups, classifies replies, builds a calling queue and books meetings, with human review wherever you require it.",
    points: [
      "Human approval before any lead enters outreach",
      "Up to three scheduled follow-ups per lead",
      "Replies classified, with unclear ones escalated to a person",
    ],
  },
] as const;

const WORKFLOW = [
  { label: "Lead search request", detail: "You choose location, category, service and quality thresholds." },
  { label: "Opportunity Hunter", detail: "The agent searches public business sources for matching companies." },
  { label: "Business analysis", detail: "Websites are checked for performance, structure and technical issues." },
  { label: "Contact verification", detail: "Public emails and phone numbers are validated before use." },
  { label: "Duplicate removal", detail: "Businesses already in your database are filtered out." },
  { label: "Lead scoring", detail: "Each lead receives a score with a visible breakdown." },
  { label: "Human approval", detail: "Your team approves or rejects before any contact is made." },
  { label: "Email outreach", detail: "Personalised first emails are sent to approved leads." },
  { label: "Follow-ups", detail: "Scheduled follow-ups continue until a reply arrives." },
  { label: "Reply handling", detail: "Replies are classified and routed to the right next step." },
  { label: "Calling queue", detail: "Leads that need a call are queued for your team." },
  { label: "Meeting booking", detail: "Interested leads are converted into booked meetings." },
] as const;

const HERO_PHASES = [
  { title: "You define the market", detail: "Location, radius, category, service and quality thresholds." },
  { title: "The agent searches and verifies", detail: "Public sources, website checks, contact validation, de-duplication." },
  { title: "Your team approves", detail: "Nothing is contacted until a person signs off on the lead." },
  { title: "Outreach runs", detail: "Personalised emails, follow-ups, reply handling and meeting booking." },
] as const;

/** Where a person decides, rather than the system. */
const CONTROLS = [
  {
    icon: ClipboardCheck,
    title: "Search criteria",
    detail:
      "Country, region, radius, business category, service line and the score threshold a lead must reach to be worth reviewing.",
  },
  {
    icon: UserCheck,
    title: "Approval gate",
    detail:
      "Every discovered lead waits in the approval queue. Rejecting one records the reason and removes it from outreach.",
  },
  {
    icon: FileCheck2,
    title: "Message review",
    detail:
      "Drafted emails and generated audit reports can be read and approved in the dashboard before anything is sent.",
  },
  {
    icon: Gauge,
    title: "Run visibility",
    detail:
      "Each search request shows live progress, the agent activity log and the reason behind any failure or retry.",
  },
] as const;

/** Drawn from the platform's documented security boundaries. */
const SAFEGUARDS = [
  {
    icon: Lock,
    title: "Credentials stay server-side",
    detail:
      "The browser talks only to same-origin API routes. Webhook URLs, service-role keys and third-party API keys are read on the server and never reach the client bundle.",
  },
  {
    icon: ShieldCheck,
    title: "Sending is deliberately gated",
    detail:
      "Outreach workflows import inactive with no mail credentials bound, so nothing can send until an administrator connects and activates them.",
  },
  {
    icon: Database,
    title: "Public sources only",
    detail:
      "Business details are gathered from public sources and validated before use. Leads already in your database are filtered out rather than contacted twice.",
  },
] as const;

const FAQS = [
  {
    q: "Where do the leads come from?",
    a: "There is no purchased contact list. You describe a market — location, radius, category and service line — and the Opportunity Hunter Agent searches public business sources for companies that match, then analyses each one for signals that it needs development work.",
  },
  {
    q: "Can the system email someone without my approval?",
    a: "No. Every discovered lead stops at the approval queue, and only approved leads are handed to the Outreach Agent. The outreach workflows also ship inactive with no mail credentials attached, so sending is impossible until an administrator deliberately connects and activates them.",
  },
  {
    q: "How are contact details verified?",
    a: "Public emails and phone numbers are validated before use and the result of that check is recorded against the lead. Businesses without a reachable website, and businesses already saved in your database, are filtered out before scoring.",
  },
  {
    q: "What does the lead score mean?",
    a: "Each lead receives a score with a visible breakdown, so you can see which signals produced the number rather than trusting a single figure. You set the threshold a lead must reach when you create the search request.",
  },
  {
    q: "How many follow-ups are sent?",
    a: "Up to three scheduled follow-ups per lead. They stop as soon as a reply arrives. Replies are then classified automatically, and anything unclear is escalated to a person rather than being answered by the system.",
  },
  {
    q: "What is in the website audit report?",
    a: "Approved leads can have an evidence-based audit generated as a branded PDF covering performance, structure and technical issues found on their site. The report is produced first, reviewed in the dashboard, and only then attached to an outreach email.",
  },
  {
    q: "What happens to a lead that is not interested?",
    a: "Replies are classified and routed. Leads that need a conversation are queued for your team to call, interested leads are converted into booked meetings, and rejections are recorded with their reason so the same business is not approached again.",
  },
  {
    q: "Can I try it without connecting a backend?",
    a: "Yes. With demo mode enabled the dashboard runs entirely against a bundled demo dataset, with no Supabase project or workflow server required, so you can walk the full pipeline before connecting anything real.",
  },
] as const;

/** Section heading block, so every section opens at the same size and rhythm. */
function SectionHeading({
  id,
  title,
  lead,
}: {
  id: string;
  title: string;
  lead: string;
}) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="text-[20px] font-semibold sm:text-[22px]">
        {title}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--app-text-muted)] sm:text-[14px]">
        {lead}
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--app-bg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
        <div className={`${CONTAINER} flex h-14 items-center justify-between gap-4`}>
          <Link href="/" aria-label="Code Nativex home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="#workflow">How it works</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="#faq">FAQ</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {/* Hero ----------------------------------------------------------- */}
        <section className="border-b border-[var(--app-border)] bg-[var(--app-panel)]">
          <div
            className={`${CONTAINER} ${SECTION} grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-16`}
          >
            <div>
              <span className="label-caption flex items-center gap-2 text-[var(--app-primary)]">
                <Sparkles className="size-3.5" aria-hidden />
                Lead Generation Agent
              </span>
              <h1 className="mt-4 max-w-[20ch] text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] text-balance text-[var(--app-text)] sm:text-[2.25rem] lg:text-[2.5rem]">
                Find Qualified Business Leads and Automate Your Outreach
              </h1>
              <p className="mt-5 max-w-[62ch] text-[14px] leading-relaxed text-[var(--app-text-muted)] sm:text-[15px]">
                Code Nativex does not start from a purchased contact list. You describe the market you
                want, and the Opportunity Hunter Agent discovers matching businesses, analyses their
                websites, verifies public contact details, removes duplicates and scores every lead.
                Nothing is contacted until your team approves it.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/dashboard">
                    Open Dashboard
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </div>

            {/* Describes how the system operates. No metrics are claimed here. */}
            <aside className="rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-bg)] p-5">
              <h2 className="label-caption">How a lead reaches your team</h2>
              <ol className="mt-4 space-y-4">
                {HERO_PHASES.map((phase, index) => (
                  <li key={phase.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden
                        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--app-border-strong)] bg-[var(--app-panel)] text-[10px] font-semibold tabular-nums text-[var(--app-text-muted)]"
                      >
                        {index + 1}
                      </span>
                      {index < HERO_PHASES.length - 1 ? (
                        <span aria-hidden className="mt-1 w-px flex-1 bg-[var(--app-border)]" />
                      ) : null}
                    </div>
                    <div className="min-w-0 pb-0.5">
                      <p className="text-[13px] font-medium text-[var(--app-text)]">{phase.title}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--app-text-muted)]">
                        {phase.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>

        {/* What the system does ------------------------------------------- */}
        <section className={`${CONTAINER} ${SECTION}`} aria-labelledby="features-heading">
          <SectionHeading
            id="features-heading"
            title="What the system does"
            lead="Three stages take a search request from an empty database to a booked meeting."
          />
          <div className={`${HEADING_GAP} grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`}>
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="flex flex-col rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-panel)] p-5"
              >
                <feature.icon className="size-5 text-[var(--app-primary)]" aria-hidden />
                <h3 className="mt-3 text-[15px] font-semibold">{feature.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                  {feature.body}
                </p>
                <ul className="mt-4 space-y-2 border-t border-[var(--app-border)] pt-4">
                  {feature.points.map((point) => (
                    <li key={point} className="flex gap-2 text-[13px] text-[var(--app-text-muted)]">
                      <BadgeCheck
                        className="mt-0.5 size-3.5 shrink-0 text-teal-600 dark:text-teal-500"
                        aria-hidden
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* What you control ----------------------------------------------- */}
        <section
          className="border-y border-[var(--app-border)] bg-[var(--app-panel)]"
          aria-labelledby="controls-heading"
        >
          <div className={`${CONTAINER} ${SECTION}`}>
            <SectionHeading
              id="controls-heading"
              title="What stays under your control"
              lead="The agents do the searching and drafting. These four decisions remain with a person."
            />
            <dl className={`${HEADING_GAP} grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4`}>
              {CONTROLS.map((item) => (
                <div key={item.title} className="border-t-2 border-[var(--app-primary)] pt-4">
                  <dt className="flex items-center gap-2 text-[14px] font-semibold">
                    <item.icon className="size-4 shrink-0 text-[var(--app-primary)]" aria-hidden />
                    {item.title}
                  </dt>
                  <dd className="mt-2 text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                    {item.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Workflow -------------------------------------------------------- */}
        <section id="workflow" className={`${CONTAINER} ${SECTION}`} aria-labelledby="workflow-heading">
          <SectionHeading
            id="workflow-heading"
            title="The workflow"
            lead="Every lead follows the same twelve steps, and every step is visible in the dashboard."
          />
          <ol className={`${HEADING_GAP} grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3`}>
            {WORKFLOW.map((step, index) => (
              <li
                key={step.label}
                className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3.5"
              >
                <span
                  aria-hidden
                  className="text-[11px] font-semibold tabular-nums text-[var(--app-text-subtle)]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--app-text)]">{step.label}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--app-text-muted)]">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Safeguards ------------------------------------------------------ */}
        <section
          className="border-y border-[var(--app-border)] bg-[var(--app-panel)]"
          aria-labelledby="safeguards-heading"
        >
          <div className={`${CONTAINER} ${SECTION}`}>
            <SectionHeading
              id="safeguards-heading"
              title="How data and sending are handled"
              lead="The platform is built so that contacting someone is always a deliberate act."
            />
            <div className={`${HEADING_GAP} grid grid-cols-1 gap-4 lg:grid-cols-3`}>
              {SAFEGUARDS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-bg)] p-5"
                >
                  <item.icon className="size-5 text-[var(--app-primary)]" aria-hidden />
                  <h3 className="mt-3 text-[14px] font-semibold">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ -------------------------------------------------------------
            Native <details> keeps this a server component with no client
            JavaScript, and stays keyboard and screen-reader accessible. */}
        <section id="faq" className={`${CONTAINER} ${SECTION}`} aria-labelledby="faq-heading">
          <SectionHeading
            id="faq-heading"
            title="Frequently asked questions"
            lead="What the system does, what it will not do without you, and how to try it."
          />
          <div className={`${HEADING_GAP} divide-y divide-[var(--app-border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-panel)]`}>
            {FAQS.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-[14px] font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-panel-muted)] sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">{item.q}</span>
                  <span
                    aria-hidden
                    className="relative size-4 shrink-0 text-[var(--app-text-subtle)]"
                  >
                    {/* A plus that loses its vertical stroke when open. */}
                    <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-current" />
                    <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-current transition-transform duration-150 group-open:scale-y-0" />
                  </span>
                </summary>
                <p className="px-4 pb-4 text-[13px] leading-relaxed text-[var(--app-text-muted)] sm:px-5 sm:pr-16">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing call to action ------------------------------------------ */}
        <section className={`${CONTAINER} pb-12 sm:pb-16 lg:pb-20`}>
          <div className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius-card)] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex gap-3">
              <CalendarCheck className="mt-0.5 size-5 shrink-0 text-[var(--app-primary)]" aria-hidden />
              <div>
                <h2 className="text-[15px] font-semibold">Ready to run your first search?</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                  Sign in to define your target market and start the Opportunity Hunter Agent.
                </p>
              </div>
            </div>
            <Button asChild className="w-full shrink-0 sm:w-auto">
              <Link href="/dashboard">
                Open Dashboard
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--app-border)] bg-[var(--app-panel)]">
        <div className={`${CONTAINER} flex flex-col gap-6 py-8 md:flex-row md:items-start md:justify-between`}>
          <div className="max-w-md">
            <Logo />
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--app-text-muted)]">
              Code Nativex builds websites, frontends and MVPs. The Lead Generation System is the
              internal platform our team uses to discover, qualify and contact prospective clients.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[var(--app-text-muted)]"
          >
            <Link className="hover:text-[var(--app-text)]" href="#workflow">
              How it works
            </Link>
            <Link className="hover:text-[var(--app-text)]" href="#faq">
              FAQ
            </Link>
            <Link className="hover:text-[var(--app-text)]" href="/login">
              Sign in
            </Link>
            <Link className="hover:text-[var(--app-text)]" href="/dashboard">
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="border-t border-[var(--app-border)]">
          <div className={`${CONTAINER} py-4 text-[12px] text-[var(--app-text-subtle)]`}>
            © {new Date().getFullYear()} Code Nativex. Internal lead intelligence platform.
          </div>
        </div>
      </footer>
    </div>
  );
}
