-- Apply after 202610180001_automation_opportunities.sql. Existing jobs keep their location.
begin;
alter table public.automation_discovery_jobs add column if not exists region text not null default '';
commit;
