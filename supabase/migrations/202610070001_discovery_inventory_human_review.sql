-- CodeNativeX discovery inventory + human review gate.
-- Additive only: no existing rows are deleted or overwritten.

begin;

alter table public.lead_discovery_candidates
  add column if not exists review_status text not null default 'pending',
  add column if not exists review_reason text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists is_recommended boolean not null default false,
  add column if not exists recommendation_rank integer;

alter table public.lead_pipeline
  add column if not exists discovery_candidate_id uuid references public.lead_discovery_candidates(id) on delete set null,
  add column if not exists outreach_prepare_report boolean not null default true,
  add column if not exists outreach_enable_booking_link boolean not null default true;

create index if not exists lead_discovery_candidates_job_review_idx
  on public.lead_discovery_candidates (job_id, review_status, created_at);
create index if not exists lead_discovery_candidates_job_recommended_idx
  on public.lead_discovery_candidates (job_id, is_recommended, recommendation_rank);
create unique index if not exists lead_pipeline_discovery_candidate_idx
  on public.lead_pipeline (discovery_candidate_id)
  where discovery_candidate_id is not null;

alter table public.lead_discovery_candidates
  drop constraint if exists lead_discovery_candidates_review_status_check;
alter table public.lead_discovery_candidates
  add constraint lead_discovery_candidates_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));

alter table public.lead_discovery_candidates
  drop constraint if exists lead_discovery_candidates_recommendation_rank_check;
alter table public.lead_discovery_candidates
  add constraint lead_discovery_candidates_recommendation_rank_check
  check (recommendation_rank is null or recommendation_rank between 1 and 2);

create or replace function public.codenativex_rank_discovery_candidates(p_job_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lead_discovery_candidates
  set is_recommended = false,
      recommendation_rank = null,
      updated_at = now()
  where job_id = p_job_id;

  with ranked as (
    select
      id,
      row_number() over (
        order by
          (
            case when nullif(trim(email), '') is not null then 4 else 0 end
            + case when nullif(trim(coalesce(resolved_website, website)), '') is not null then 3 else 0 end
            + case when nullif(trim(phone), '') is not null then 2 else 0 end
            + case when nullif(trim(source_url), '') is not null then 1 else 0 end
          ) desc,
          created_at asc,
          id asc
      ) as recommendation_rank
    from public.lead_discovery_candidates
    where job_id = p_job_id
  )
  update public.lead_discovery_candidates candidate
  set is_recommended = true,
      recommendation_rank = ranked.recommendation_rank,
      updated_at = now()
  from ranked
  where candidate.id = ranked.id
    and ranked.recommendation_rank <= 2;
end;
$$;

revoke all on function public.codenativex_rank_discovery_candidates(text) from public, anon, authenticated;
grant execute on function public.codenativex_rank_discovery_candidates(text) to service_role;

create or replace function public.codenativex_stop_after_discovery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  discovered_count integer;
begin
  if coalesce(new.input_payload ->> 'processing_mode', '') = 'human_review'
     and coalesce(new.next_workflow, '') ilike '00C%' then
    perform public.codenativex_rank_discovery_candidates(new.job_id);

    select count(*)
      into discovered_count
    from public.lead_discovery_candidates
    where job_id = new.job_id;

    new.status := 'needs_review';
    new.current_stage := 'human_review_ready';
    new.progress_percent := 100;
    new.next_workflow := null;
    new.businesses_found := greatest(coalesce(new.businesses_found, 0), discovered_count);
    new.verified_leads := discovered_count;
    new.completed_at := coalesce(new.completed_at, now());
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists codenativex_stop_after_discovery_trigger on public.lead_discovery_jobs;
create trigger codenativex_stop_after_discovery_trigger
before update of next_workflow, current_stage, status
on public.lead_discovery_jobs
for each row
execute function public.codenativex_stop_after_discovery();

create or replace function public.codenativex_promote_discovery_candidate(
  p_candidate_id uuid,
  p_reviewed_by text,
  p_prepare_report boolean default true,
  p_enable_booking boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate public.lead_discovery_candidates%rowtype;
  promoted_id uuid;
  candidate_key text;
begin
  select *
    into candidate
  from public.lead_discovery_candidates
  where id = p_candidate_id
  for update;

  if not found then
    raise exception 'Discovery candidate was not found.';
  end if;
  if candidate.review_status <> 'approved' then
    raise exception 'Human approval is required before outreach.';
  end if;
  if nullif(trim(candidate.email), '') is null then
    raise exception 'An email address is required for email outreach.';
  end if;

  candidate_key := coalesce(nullif(candidate.lead_key, ''), 'candidate:' || candidate.id::text);

  select id
    into promoted_id
  from public.lead_pipeline
  where lead_key = candidate_key
     or discovery_candidate_id = candidate.id
  order by updated_at desc nulls last
  limit 1
  for update;

  if promoted_id is null then
    insert into public.lead_pipeline (
      discovery_candidate_id,
      lead_key,
      company_name,
      website,
      contact_name,
      job_title,
      email,
      phone,
      country,
      city,
      industry,
      source,
      source_url,
      need_signal,
      service_interest,
      email_validation_status,
      qualification_score,
      status,
      approval_status,
      approved_by,
      outreach_status,
      next_action,
      next_workflow,
      do_not_contact,
      duplicate_count,
      human_review_required,
      audit_status,
      outreach_prepare_report,
      outreach_enable_booking_link,
      created_at,
      updated_at
    )
    values (
      candidate.id,
      candidate_key,
      candidate.company_name,
      coalesce(candidate.resolved_website, candidate.website),
      candidate.contact_name,
      candidate.job_title,
      candidate.email,
      candidate.phone,
      candidate.country,
      candidate.city,
      candidate.industry,
      candidate.source,
      candidate.source_url,
      candidate.need_signal,
      candidate.service_interest,
      'syntax_valid',
      0,
      'audit_pending',
      'approved',
      p_reviewed_by,
      'not_started',
      'run_verified_website_audit',
      '02A - Website Audit & Branded Report Generator',
      false,
      0,
      false,
      'audit_pending',
      p_prepare_report,
      p_enable_booking,
      coalesce(candidate.created_at, now()),
      now()
    )
    returning id into promoted_id;
  else
    update public.lead_pipeline
    set discovery_candidate_id = candidate.id,
        company_name = coalesce(nullif(company_name, ''), candidate.company_name),
        website = coalesce(candidate.resolved_website, candidate.website, website),
        email = coalesce(candidate.email, email),
        phone = coalesce(candidate.phone, phone),
        approval_status = 'approved',
        approved_by = p_reviewed_by,
        status = 'audit_pending',
        outreach_status = 'not_started',
        next_action = 'run_verified_website_audit',
        next_workflow = '02A - Website Audit & Branded Report Generator',
        human_review_required = false,
        audit_status = 'audit_pending',
        audit_error_code = null,
        audit_error_message = null,
        email_preview_status = null,
        outreach_prepare_report = p_prepare_report,
        outreach_enable_booking_link = p_enable_booking,
        updated_at = now()
    where id = promoted_id;
  end if;

  return promoted_id;
end;
$$;

revoke all on function public.codenativex_promote_discovery_candidate(uuid, text, boolean, boolean)
  from public, anon;
grant execute on function public.codenativex_promote_discovery_candidate(uuid, text, boolean, boolean)
  to authenticated, service_role;

comment on function public.codenativex_stop_after_discovery() is
  'Stops new human-review requests after discovery, preserving every candidate for dashboard review.';
comment on function public.codenativex_promote_discovery_candidate(uuid, text, boolean, boolean) is
  'Promotes one human-approved discovery candidate into lead_pipeline and queues the verified audit.';

commit;
