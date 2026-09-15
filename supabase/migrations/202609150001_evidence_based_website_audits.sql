-- CodeNativeX evidence-based website audits
-- Additive only: this migration does not update or delete existing rows.

create extension if not exists pgcrypto;

alter table public.lead_pipeline
  add column if not exists audit_id uuid,
  add column if not exists audit_status text not null default 'not_started',
  add column if not exists audit_score integer,
  add column if not exists audit_confidence integer,
  add column if not exists audit_findings jsonb not null default '[]'::jsonb,
  add column if not exists audit_evidence jsonb not null default '{}'::jsonb,
  add column if not exists audit_report_url text,
  add column if not exists audit_report_filename text,
  add column if not exists audit_generated_at timestamptz,
  add column if not exists audit_error_code text,
  add column if not exists audit_error_message text,
  add column if not exists website_screenshot_url text,
  add column if not exists email_preview_status text,
  add column if not exists outreach_approved_at timestamptz,
  add column if not exists outreach_html_body text,
  add column if not exists outreach_plain_text_body text,
  add column if not exists outreach_send_key uuid;

create table if not exists public.website_audits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.lead_pipeline(id) on delete cascade,
  status text not null default 'audit_pending',
  audited_url text,
  final_url text,
  http_status integer,
  has_https boolean,
  audit_score integer,
  confidence integer,
  scores jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  screenshot_path text,
  report_path text,
  report_filename text,
  generated_at timestamptz,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_audits_status_check check (status in (
    'audit_pending', 'audit_processing', 'audit_completed', 'audit_failed', 'audit_needs_review'
  )),
  constraint website_audits_score_check check (audit_score is null or audit_score between 0 and 100),
  constraint website_audits_confidence_check check (confidence is null or confidence between 0 and 100)
);

create index if not exists website_audits_lead_created_idx
  on public.website_audits (lead_id, created_at desc);
create index if not exists website_audits_status_idx
  on public.website_audits (status);
create index if not exists lead_pipeline_audit_status_idx
  on public.lead_pipeline (audit_status);
create unique index if not exists lead_pipeline_outreach_send_key_idx
  on public.lead_pipeline (outreach_send_key)
  where outreach_send_key is not null;

alter table public.website_audits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'website_audits' and policyname = 'Authenticated users can read website audits'
  ) then
    create policy "Authenticated users can read website audits"
      on public.website_audits for select to authenticated using (true);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('website-audit-reports', 'website-audit-reports', false, 5242880, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can read audit reports'
  ) then
    create policy "Authenticated users can read audit reports"
      on storage.objects for select to authenticated
      using (bucket_id = 'website-audit-reports');
  end if;
end $$;

comment on table public.website_audits is
  'Immutable evidence snapshots and generated report references for website-audit outreach.';
comment on column public.lead_pipeline.audit_report_url is
  'Private Supabase Storage object path; the dashboard serves it through an authenticated API.';
comment on column public.lead_pipeline.outreach_send_key is
  'Atomic idempotency claim used before Gmail Send.';
