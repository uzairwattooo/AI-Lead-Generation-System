-- Apply in Supabase SQL Editor before deploying the dashboard update.
-- No records are deleted by this migration.
begin;
alter table public.lead_pipeline
  add column if not exists dashboard_action_at timestamptz,
  add column if not exists dashboard_action text,
  add column if not exists dashboard_deleted_at timestamptz;
alter table public.lead_discovery_candidates
  add column if not exists dashboard_action_at timestamptz,
  add column if not exists dashboard_action text,
  add column if not exists dashboard_deleted_at timestamptz;
-- Preserve known review dates; never invent historical approval times.
update public.lead_discovery_candidates
set dashboard_action_at = reviewed_at, dashboard_action = review_status
where dashboard_action_at is null and reviewed_at is not null;
commit;
