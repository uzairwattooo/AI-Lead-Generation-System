begin;
alter table public.automation_discovery_jobs
 add column if not exists stage text not null default 'queued',
 add column if not exists progress_percent integer not null default 0,
 add column if not exists found_count integer not null default 0,
 add column if not exists processed_count integer not null default 0,
 add column if not exists review_count integer not null default 0,
 add column if not exists verified_count integer not null default 0,
 add column if not exists duplicate_count integer not null default 0,
 add column if not exists diagnostics jsonb not null default '[]'::jsonb,
 add column if not exists run_id uuid;

-- Each execution gets a lease; stale executions cannot overwrite a later run.
create or replace function public.automation_claim_job() returns setof public.automation_discovery_jobs
language sql security definer set search_path=public,pg_temp as $$
 update automation_discovery_jobs
 set status='running', stage='searching', progress_percent=5,
 found_count=0,processed_count=0,result_count=0,review_count=0,verified_count=0,duplicate_count=0,
 diagnostics='[]'::jsonb,error=null,run_id=gen_random_uuid(),updated_at=now()
 where id=(select id from automation_discovery_jobs where status='queued' order by created_at for update skip locked limit 1)
 returning *;
$$;
revoke all on function public.automation_claim_job() from public,anon,authenticated;
grant execute on function public.automation_claim_job() to service_role;
commit;
