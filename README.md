# CodeNativeX Lead Generation System — Frontend

A production-quality Next.js frontend for the CodeNativeX lead pipeline:

```
Lead Search Request → Opportunity Hunter → Business Analysis → Contact Verification
→ Duplicate Removal → Lead Scoring → Human Approval → Email Outreach → Follow-ups
→ Reply Handling → Calling Queue → Meeting Booking
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
Radix primitives in the shadcn/ui style · Lucide icons · TanStack Query ·
React Hook Form + Zod · Supabase Auth · Sonner toasts.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

With `NEXT_PUBLIC_DEMO_MODE=true` the app runs entirely against the bundled
demo adapter — no Supabase or n8n required.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |

## Architecture

```
src/
  app/                 Routes: public landing, /login, /dashboard/*, /api/*
  components/          UI primitives, layout shell, lead table + drawer
  hooks/               TanStack Query hooks (the only data entry point for pages)
  services/            Centralized client service layer (http.ts, lead-service.ts)
  server/              Server-only code
    data/              LeadRepository contract + demo and Supabase adapters
    n8n.ts             Server-side webhook dispatch
    env.ts             Server-only environment access
  lib/                 Design tokens (globals.css), schemas, constants, formatters
  types/               Domain models
```

### Security boundaries

* The browser talks **only** to same-origin `/api/*` routes.
* n8n webhook URLs, the webhook secret, the Supabase service-role key and any
  third-party API keys are read exclusively in `src/server/*` and never reach
  the client bundle.
* `middleware.ts` refreshes the Supabase session and keeps `/dashboard` private.
* Demo data lives in exactly one file (`src/server/data/demo-dataset.ts`) and is
  served through one adapter, never inlined into components.

### Swapping in the real backend

Implement or adjust `SupabaseAdapter` in `src/server/data/supabase-adapter.ts`.
Table names are collected in the exported `TABLES` constant. Nothing above the
`LeadRepository` interface needs to change.

### Final dashboard reporting

The live Overview page reads the latest immutable snapshot from the
`lead_dashboard_latest` Supabase view. Before enabling live mode:

1. Run `CodeNativeX_06_Final_Dashboard_Reporting_Setup.sql` in Supabase.
2. Import and run `06 - Final Dashboard & Reporting Worker` in n8n.
3. Set `NEXT_PUBLIC_DEMO_MODE=false` and provide the Supabase public URL and
   anon key in the deployment environment.

The browser receives dashboard totals and review summaries only. Supabase
service-role credentials remain server-side and are never exposed to the UI.
"# AI-Lead-Generation-System" 
