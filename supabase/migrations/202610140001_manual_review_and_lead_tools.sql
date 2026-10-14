begin;
-- Reverse only the automatic rejection rule. Manual rejection remains unchanged.
drop trigger if exists codenativex_auto_reject_blocked_audit on public.lead_pipeline;
drop function if exists public.codenativex_reject_blocked_audit();
update public.lead_pipeline
set approval_status='approved', rejection_reason=null, approved_by='system-restore',
    dashboard_action='approved', dashboard_action_at=statement_timestamp(), updated_at=statement_timestamp(),
    next_workflow=null, next_follow_up_at=null, outreach_approved_at=null,
    email_preview_status=null, outreach_status='not_started', next_action='manual_review'
where approval_status='rejected' and approved_by='audit-system'
  and rejection_reason like 'Automatically rejected:%' and dashboard_deleted_at is null;
update public.lead_discovery_candidates c
set review_status='approved', review_reason=null, reviewed_by='system-restore', reviewed_at=statement_timestamp(),
    dashboard_action='approved', dashboard_action_at=statement_timestamp(), updated_at=statement_timestamp()
where c.review_status='rejected' and c.reviewed_by='audit-system'
  and c.review_reason like 'Automatically rejected:%' and c.dashboard_deleted_at is null
  and not exists(select 1 from public.lead_pipeline p where p.lead_key=c.lead_key and p.approval_status='rejected');

alter table public.lead_pipeline
 add column if not exists visual_concept_path text,
 add column if not exists visual_before_path text,
 add column if not exists visual_after_path text,
 add column if not exists visual_concept_job_id uuid,
 add column if not exists outreach_include_concept boolean not null default false,
 add column if not exists admin_notification_status text,
 add column if not exists admin_notification_error text,
 add column if not exists admin_notification_sent_at timestamptz;
create table if not exists public.codenativex_lead_tool_jobs (
 id uuid primary key default gen_random_uuid(), lead_id uuid not null,
 kind text not null check(kind in ('contacts','concept')),
 status text not null default 'queued' check(status in ('queued','processing','completed','needs_review','failed')),
 requested_by text not null, target jsonb not null, result jsonb, error_message text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists lead_tools_one_active_job on public.codenativex_lead_tool_jobs(lead_id,kind) where status in ('queued','processing');
alter table public.codenativex_lead_tool_jobs enable row level security;
-- Job table is accessed only through authenticated dashboard routes/server role.
revoke all on public.codenativex_lead_tool_jobs from anon, authenticated;
commit;
