import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  MailCheck,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

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

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--app-bg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-panel)]/80 shadow-xs backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Code Nativex home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2" aria-label="Primary">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="#workflow">How it works</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden border-b border-[var(--app-border)] bg-[var(--app-panel)]">
          {/* Decorative field: a dot grid faded out by a radial mask, plus a
              brand-tinted glow. Kept behind the content and aria-hidden. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-dot-grid opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-[var(--app-primary)]/10 blur-3xl"
          />
          <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-panel-muted)]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--app-primary)] shadow-xs backdrop-blur-sm">
                <Sparkles className="size-3.5" aria-hidden />
                Lead Generation Agent
              </span>
              <h1 className="text-gradient mt-6 max-w-[18ch] text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.035em] text-balance sm:text-[2.9rem] lg:text-[3.4rem]">
                Find Qualified Business Leads and Automate Your Outreach
              </h1>
              <p className="mt-6 max-w-[62ch] text-[15px] leading-relaxed text-[var(--app-text-muted)]">
                Code Nativex does not start from a purchased contact list. You describe the market you want,
                and the Opportunity Hunter Agent discovers matching businesses, analyses their websites,
                verifies public contact details, removes duplicates and scores every lead. Nothing is
                contacted until your team approves it.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    Open Dashboard
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </div>

            {/* Describes how the system operates. No metrics are claimed here. */}
            <aside className="surface-raised rounded-[var(--radius-panel)] border border-[var(--app-border)] p-6 shadow-(--shadow-raised)">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-subtle)]">
                How a lead reaches your team
              </h2>
              <ol className="mt-4 space-y-4">
                {HERO_PHASES.map((phase, index) => (
                  <li key={phase.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-[10px] font-semibold tabular-nums text-[var(--app-primary)] ring-1 ring-inset ring-[var(--app-border)]"
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

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-[26px] font-semibold tracking-[-0.03em]">
            What the system does
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] text-[var(--app-text-muted)]">
            Three stages take a search request from an empty database to a booked meeting.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="surface-raised flex flex-col rounded-[var(--radius-panel)] border border-[var(--app-border)] p-6 transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-(--shadow-raised)"
              >
                <span
                  aria-hidden
                  className="flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-(--shadow-primary) ring-1 ring-inset ring-white/25"
                >
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.015em]">{feature.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                  {feature.body}
                </p>
                <ul className="mt-4 space-y-2 border-t border-[var(--app-border)] pt-4">
                  {feature.points.map((point) => (
                    <li key={point} className="flex gap-2 text-[13px] text-[var(--app-text-muted)]">
                      <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section
          id="workflow"
          className="border-y border-[var(--app-border)] bg-[var(--app-panel)]"
          aria-labelledby="workflow-heading"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="workflow-heading" className="text-[26px] font-semibold tracking-[-0.03em]">
              The workflow
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] text-[var(--app-text-muted)]">
              Every lead follows the same twelve steps, and every step is visible in the dashboard.
            </p>
            <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WORKFLOW.map((step, index) => (
                <li
                  key={step.label}
                  className="surface-raised flex gap-3 rounded-[var(--radius-card)] border border-[var(--app-border)] px-4 py-4 transition-[border-color,box-shadow] duration-200 hover:border-[var(--app-border-strong)] hover:shadow-(--shadow-raised)"
                >
                  <span
                    aria-hidden
                    className="text-[12px] font-semibold tabular-nums text-[var(--app-primary)]"
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
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="surface-tinted relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--app-border)] p-7 shadow-(--shadow-raised) sm:flex-row sm:items-center">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[var(--app-primary)]/12 blur-3xl"
            />
            <div className="relative flex gap-4">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-(--shadow-primary) ring-1 ring-inset ring-white/25"
              >
                <CalendarCheck className="size-5" />
              </span>
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Ready to run your first search?</h2>
                <p className="mt-1 text-[13px] text-[var(--app-text-muted)]">
                  Sign in to define your target market and start the Opportunity Hunter Agent.
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="relative shrink-0">
              <Link href="/dashboard">
                Open Dashboard
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--app-border)] bg-[var(--app-panel)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo />
            <p className="mt-2 max-w-md text-xs text-[var(--app-text-muted)]">
              Code Nativex builds websites, frontends and MVPs. The Lead Generation System is the internal
              platform our team uses to discover, qualify and contact prospective clients.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--app-text-muted)]">
            <Link className="hover:text-[var(--app-text)]" href="#workflow">
              How it works
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
          <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-[var(--app-text-subtle)] sm:px-6">
            © {new Date().getFullYear()} Code Nativex. Internal lead intelligence platform.
          </div>
        </div>
      </footer>
    </div>
  );
}
