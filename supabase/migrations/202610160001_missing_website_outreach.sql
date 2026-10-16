begin;
alter table public.lead_pipeline add column if not exists outreach_kind text not null default 'website_audit';
alter table public.website_audits drop constraint if exists website_audits_status_check;
alter table public.website_audits add constraint website_audits_status_check check (status in ('audit_pending','audit_processing','audit_completed','audit_failed','audit_needs_review','website_missing'));
-- Add website_missing to any existing text CHECK on lead_pipeline.audit_status.
-- Preserve previous constraints and definitions instead of removing validation.
do $$
declare c record;
begin
 for c in select conname,pg_get_constraintdef(oid) as definition,pg_get_expr(conbin,conrelid) as expression from pg_constraint
   where conrelid='public.lead_pipeline'::regclass and contype='c'
   and pg_get_constraintdef(oid) like '%audit_status%'
 loop
  if c.definition not like '%website_missing%' then
   execute format('alter table public.lead_pipeline drop constraint %I',c.conname);
   execute format('alter table public.lead_pipeline add constraint %I CHECK ((%s) OR audit_status = %L)',c.conname,c.expression,'website_missing');
  end if;
 end loop;
end $$;
-- Correct old "invalid URL"/"fetch failed" labels only where NO website is saved
-- in either pipeline or any linked discovery candidate. This does not queue/send mail.
update public.lead_pipeline p set audit_status='website_missing',outreach_kind='website_development',
 audit_score=null,audit_confidence=null,audit_error_code=null,audit_error_message=null,
 audit_findings='[]'::jsonb,audit_evidence='{"website_missing":true}'::jsonb,
 audit_report_url=null,audit_report_filename=null,website_screenshot_url=null,
 next_workflow=null,next_follow_up_at=null,outreach_approved_at=null,email_preview_status=null,
 outreach_subject=null,outreach_body=null,outreach_plain_text_body=null,outreach_html_body=null,
 outreach_include_concept=false,outreach_status='not_started',status='website_missing',
 next_action='prepare_website_development_email',updated_at=statement_timestamp()
where nullif(btrim(p.website),'') is null and p.audit_status in ('audit_failed','audit_needs_review')
 and nullif(btrim(p.gmail_message_id),'') is null and p.first_outreach_at is null
 and p.outreach_status is distinct from 'sending' and p.dashboard_deleted_at is null
 and p.approval_status='approved'
 and not exists(select 1 from public.lead_discovery_candidates c where c.lead_key=p.lead_key
   and (nullif(btrim(c.website),'') is not null or nullif(btrim(c.resolved_website),'') is not null));
commit;
