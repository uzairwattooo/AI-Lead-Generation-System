begin;
create table if not exists public.project_applications (
  candidate_id uuid primary key references public.lead_discovery_candidates(id) on delete cascade,
  stage text not null check (stage in ('shortlisted','applied','reply','call','paid')),
  requirement text not null default '',
  fit text not null default '',
  portfolio_url text not null default '',
  proposal text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.project_applications enable row level security;
revoke all on public.project_applications from anon, authenticated;
grant select, insert, update on public.project_applications to service_role;
commit;
