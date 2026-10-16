begin;
alter table public.lead_pipeline
 add column if not exists dashboard_retry_key uuid,
 add column if not exists dashboard_retry_at timestamptz;

create table if not exists public.codenativex_dashboard_activity (
 id uuid primary key default gen_random_uuid(), lead_id uuid, lead_key text,
 request_id text, actor text not null default 'system', action text not null,
 message text not null, severity text not null default 'info',
 created_at timestamptz not null default now()
);
create index if not exists dashboard_activity_lead_idx on public.codenativex_dashboard_activity(lead_id,created_at desc);
create index if not exists dashboard_activity_key_idx on public.codenativex_dashboard_activity(lead_key,created_at desc);
create index if not exists dashboard_activity_time_idx on public.codenativex_dashboard_activity(created_at desc);
create table if not exists public.codenativex_dashboard_cost_rates (
 id text primary key check(id='default'), audit_usd numeric check(audit_usd>=0),
 contacts_usd numeric check(contacts_usd>=0), concept_usd numeric check(concept_usd>=0),
 updated_at timestamptz not null default now()
);
insert into public.codenativex_dashboard_cost_rates(id) values('default') on conflict do nothing;
alter table public.codenativex_dashboard_activity enable row level security;
alter table public.codenativex_dashboard_cost_rates enable row level security;
revoke all on public.codenativex_dashboard_activity,public.codenativex_dashboard_cost_rates from anon,authenticated;
grant select,insert,update,delete on public.codenativex_dashboard_activity,public.codenativex_dashboard_cost_rates to service_role;

-- Record changes made by dashboard APIs AND existing n8n/Supabase writes.
-- No body/contact/credentials or large audit evidence is stored in the log.
create or replace function public.codenativex_record_dashboard_activity() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare n jsonb:=to_jsonb(new); o jsonb:='{}'::jsonb; f text; fields text[];
 v text; title text; lid uuid; sev text; who text;
begin
 if tg_op='UPDATE' then o:=to_jsonb(old); end if;
 if tg_table_name='lead_discovery_jobs' then lid:=null;else lid:=coalesce(nullif(n->>'lead_id',''),n->>'id')::uuid;end if;
 fields:=case when tg_table_name='lead_discovery_jobs' then array['status','current_stage','error_message']
   when tg_table_name='codenativex_lead_tool_jobs' then array['status','error_message']
   when tg_table_name='lead_discovery_candidates' then array['review_status','dashboard_deleted_at']
   else array['approval_status','audit_status','email_preview_status','outreach_status','admin_notification_status','last_outreach_error','dashboard_deleted_at'] end;
 if tg_op='INSERT' then
  insert into codenativex_dashboard_activity(lead_id,lead_key,request_id,action,message)
  values(lid,n->>'lead_key',n->>'job_id','record_created',coalesce(n->>'company_name',n->>'kind',n->>'category','Lead')||' · record created');
 end if;
 foreach f in array fields loop
  if (n->f) is distinct from (o->f) and nullif(n->>f,'') is not null then
   v:=n->>f;
   title:=case when tg_table_name='codenativex_lead_tool_jobs' then coalesce(n->>'kind','Task')||' task' else coalesce(n->>'company_name',n->>'category','Lead') end;
   sev:=case when v like '%failed%' or f in ('error_message','last_outreach_error') then 'error'
     when v like '%review%' or v like '%blocked%' then 'warning'
     when v in ('completed','audit_completed','sent','approved') then 'success' else 'info' end;
   who:=case when tg_table_name='lead_discovery_jobs' then 'opportunity_hunter' when f in ('approval_status','review_status','dashboard_deleted_at') then 'user'
     when f in ('outreach_status','admin_notification_status','email_preview_status') then 'outreach_agent' else 'system' end;
   insert into codenativex_dashboard_activity(lead_id,lead_key,request_id,actor,action,message,severity)
   values(lid,n->>'lead_key',n->>'job_id',who,tg_table_name||'.'||f,
     title||' · '||replace(f,'_',' ')||': '||left(replace(v,'_',' '),1000),sev);
  end if;
 end loop;
 return new;
end $$;
drop trigger if exists codenativex_dashboard_activity on public.lead_pipeline;
create trigger codenativex_dashboard_activity after insert or update on public.lead_pipeline
 for each row execute function public.codenativex_record_dashboard_activity();
drop trigger if exists codenativex_dashboard_activity on public.lead_discovery_candidates;
create trigger codenativex_dashboard_activity after insert or update on public.lead_discovery_candidates
 for each row execute function public.codenativex_record_dashboard_activity();
drop trigger if exists codenativex_dashboard_activity on public.codenativex_lead_tool_jobs;
create trigger codenativex_dashboard_activity after insert or update on public.codenativex_lead_tool_jobs
 for each row execute function public.codenativex_record_dashboard_activity();
drop trigger if exists codenativex_dashboard_activity on public.lead_discovery_jobs;
create trigger codenativex_dashboard_activity after insert or update on public.lead_discovery_jobs
 for each row execute function public.codenativex_record_dashboard_activity();

-- Statement-time aggregates, independent of reporting workflow snapshots and
-- PostgREST's row-return limit. Promoted businesses are counted once.
create or replace function public.codenativex_dashboard_live_summary() returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
with inventory as (
 select coalesce(nullif(p.lead_key,''),nullif(c.lead_key,''),c.id::text) k,
   to_jsonb(c)||coalesce(to_jsonb(p),'{}'::jsonb) r
 from lead_discovery_candidates c left join lead_pipeline p on p.lead_key=c.lead_key
 where c.dashboard_deleted_at is null and (p.id is null or p.dashboard_deleted_at is null)
 union all
 select coalesce(nullif(p.lead_key,''),p.id::text),to_jsonb(p) from lead_pipeline p
 where p.dashboard_deleted_at is null and not exists(select 1 from lead_discovery_candidates c where c.lead_key=p.lead_key)
), unique_inventory as (
 select distinct on(k) r from inventory order by k,coalesce(r->>'updated_at',r->>'created_at','') desc
), active as (select * from lead_pipeline where dashboard_deleted_at is null),
counts as (
 select count(*) total,
 count(*) filter(where r->>'email_validation_status' in ('verified','deliverable') or nullif(r->>'email_verified_at','') is not null) verified,
 count(*) filter(where case when r->>'qualification_score' ~ '^[0-9]+(\.[0-9]+)?$' then (r->>'qualification_score')::numeric>=80 else false end) high,
 count(*) filter(where coalesce(nullif(r->>'approval_status',''),nullif(r->>'review_status',''),'pending')='pending') pending,
 count(*) filter(where coalesce(r->>'approval_status',r->>'review_status')='approved') approved,
 count(*) filter(where coalesce(r->>'approval_status',r->>'review_status')='rejected') rejected
 from unique_inventory
), activity as (
 select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc),'[]'::jsonb) items
 from (select * from codenativex_dashboard_activity order by created_at desc limit 8) a
), meeting_rows as (
 select coalesce(nullif(r->>'event_uri',''),nullif(r->>'calendar_event_id',''),nullif(r->>'meeting_processing_id',''),r->>'id') k,
 coalesce(r->>'meeting_status','') status,coalesce(r->>'updated_at',r->>'source_event_at',r->>'created_at','') seen from (
 select to_jsonb(m) r from lead_meeting_events m
 union all select to_jsonb(b) from codenativex_calendly_bookings b) x
), meetings as (
 select distinct on(k) k,status from meeting_rows order by k,seen desc,(status='cancelled') desc
)
select jsonb_build_object(
 'mode','live','updatedAt',statement_timestamp(),
 'metrics',jsonb_build_object('totalLeadsFound',counts.total,'verifiedLeads',counts.verified,'highPotentialLeads',counts.high,
   'pendingApproval',counts.pending,'emailsSent',(select count(*) from lead_pipeline where first_outreach_at is not null),
   'repliesReceived',(select count(*) from lead_reply_events),
   'meetingsBooked',(select count(distinct k) from meetings where status in ('booked','scheduled','completed'))),
 'pipeline',jsonb_build_array(jsonb_build_object('stage','Discovered businesses','count',counts.total),
   jsonb_build_object('stage','Pending review','count',counts.pending),jsonb_build_object('stage','Approved','count',counts.approved),
   jsonb_build_object('stage','Rejected','count',counts.rejected)),
 'outreachSummary',(select coalesce(jsonb_agg(jsonb_build_object('stage',replace(s,'_',' '),'count',n)),'[]'::jsonb)
   from (select outreach_status s,count(*) n from active where approval_status='approved' and outreach_status is not null group by outreach_status) t),
 'recentActivity',activity.items,
 'queue',jsonb_build_object('queued',(select count(*) from active where outreach_status='queued'),
   'sending',(select count(*) from active where outreach_status='sending'),
   'failed',(select count(*) from active where outreach_status in ('failed','blocked') or audit_status in ('audit_failed','audit_needs_review') or nullif(last_outreach_error,'') is not null)),
 'notifications',jsonb_build_object('sent',(select count(*) from lead_pipeline where admin_notification_status='sent'),
   'pending',(select count(*) from lead_pipeline where admin_notification_status='pending'),
   'failed',(select count(*) from lead_pipeline where admin_notification_status in ('failed','skipped'))),
 'usage',jsonb_build_object('audits',(select count(*) from website_audits where status<>'website_missing'),
   'contacts',(select count(*) from codenativex_lead_tool_jobs where kind='contacts' and status<>'queued'),
   'concepts',(select count(*) from codenativex_lead_tool_jobs where kind='concept' and status<>'queued')),
 'rates',(select to_jsonb(c) from codenativex_dashboard_cost_rates c where id='default')
) from counts cross join activity;
$$;
revoke all on function public.codenativex_dashboard_live_summary() from public,anon,authenticated;
grant execute on function public.codenativex_dashboard_live_summary() to service_role;
commit;
