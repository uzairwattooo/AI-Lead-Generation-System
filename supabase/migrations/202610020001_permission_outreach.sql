begin;
alter table public.lead_pipeline add column if not exists audit_report_sent_at timestamptz;
alter table public.lead_pipeline add column if not exists booking_link_sent_at timestamptz;
create table if not exists public.codenativex_reply_actions (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references public.lead_pipeline(id) on delete cascade,
 reply_message_id text not null,
 action text not null check(action in ('report','booking')),
 status text not null default 'pending' check(status in ('pending','processing','sending','sent','needs_review','cancelled')),
 claim_key uuid, claimed_at timestamptz, sent_at timestamptz,
 gmail_message_id text, error_message text,
 created_at timestamptz not null default now(),
 unique(lead_id,reply_message_id)
);
create table if not exists public.codenativex_calendly_bookings (
 id uuid primary key default gen_random_uuid(),
 invitee_uri text not null unique,
 event_uri text not null,
 lead_id uuid references public.lead_pipeline(id) on delete set null,
 company_name text not null, contact_name text, client_email text not null,
 meeting_status text not null, meeting_start_at timestamptz, meeting_end_at timestamptz,
 meeting_link text, meeting_timezone text, provider text not null default 'google_meet',
 handoff_status text not null default 'pending', handoff_key uuid, handoff_claimed_at timestamptz,
 source_event_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.codenativex_reply_actions enable row level security;
alter table public.codenativex_calendly_bookings enable row level security;
revoke all on public.codenativex_reply_actions,public.codenativex_calendly_bookings from anon,authenticated;
grant all on public.codenativex_reply_actions,public.codenativex_calendly_bookings to service_role;
grant select on public.codenativex_calendly_bookings to authenticated;
drop policy if exists calendly_bookings_visible_lead on public.codenativex_calendly_bookings;
create policy calendly_bookings_visible_lead on public.codenativex_calendly_bookings for select to authenticated
using (exists(select 1 from public.lead_pipeline l where l.id=lead_id));
create or replace function public.codenativex_claim_reply_action() returns setof public.codenativex_reply_actions
language plpgsql security definer set search_path = public as $$
begin
 -- A crash around Gmail send is ambiguous. Never resend it automatically.
 update codenativex_reply_actions set status='needs_review',error_message='Stale claim; check Gmail before retrying.'
 where status in ('processing','sending') and claimed_at < now()-interval '10 minutes';
 update lead_pipeline l set status='reply_needs_review',human_review_required=true,next_workflow=null,next_follow_up_at=null,updated_at=now()
 where l.status in ('report_requested','meeting_requested') and exists(
 select 1 from codenativex_reply_actions a where a.lead_id=l.id and a.reply_message_id=l.reply_message_id and a.status='needs_review');
 return query
 with chosen as (
  select a.id from codenativex_reply_actions a join lead_pipeline l on l.id=a.lead_id
  where a.status='pending' and coalesce(l.do_not_contact,false)=false
   and l.reply_message_id=a.reply_message_id and l.status in ('report_requested','meeting_requested')
  order by a.created_at for update of a skip locked limit 1
 ) update codenativex_reply_actions a set status='processing',claim_key=gen_random_uuid(),claimed_at=now()
 from chosen where a.id=chosen.id returning a.*;
end; $$;
revoke all on function public.codenativex_claim_reply_action() from public,anon,authenticated;
grant execute on function public.codenativex_claim_reply_action() to service_role;
create or replace function public.codenativex_finish_reply_action(p_id uuid,p_key uuid,p_message text,p_error text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare a codenativex_reply_actions%rowtype;
begin
 select * into a from codenativex_reply_actions where id=p_id and claim_key=p_key for update;
 if not found then return false; end if;
 if a.status='sent' then return a.gmail_message_id=p_message; end if;
 if a.status not in ('processing','sending') then return false; end if;
 update codenativex_reply_actions set status=case when p_error is null and coalesce(p_message,'')<>'' then 'sent' else 'needs_review' end,
 gmail_message_id=p_message,error_message=p_error,sent_at=case when p_error is null and coalesce(p_message,'')<>'' then now() else null end where id=p_id;
 if p_error is null and coalesce(p_message,'')<>'' then
  update lead_pipeline set
   audit_report_sent_at=case when a.action='report' then now() else audit_report_sent_at end,
   booking_link_sent_at=case when a.action='booking' then now() else booking_link_sent_at end,
   status=case when a.action='report' then 'report_shared' else 'awaiting_booking' end,
   next_follow_up_at=null,next_workflow=null,human_review_required=false,updated_at=now()
  where id=a.lead_id and reply_message_id=a.reply_message_id and coalesce(do_not_contact,false)=false
   and status in ('report_requested','meeting_requested');
 else
  update lead_pipeline set status='reply_needs_review',human_review_required=true,next_follow_up_at=null,next_workflow=null,updated_at=now()
  where id=a.lead_id and reply_message_id=a.reply_message_id and status in ('report_requested','meeting_requested');
 end if;
 return true;
end; $$;
revoke all on function public.codenativex_finish_reply_action(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.codenativex_finish_reply_action(uuid,uuid,text,text) to service_role;
create or replace function public.codenativex_save_calendly_booking(p_row jsonb) returns boolean
language plpgsql security definer set search_path=public as $$
declare lid uuid; latest codenativex_calendly_bookings%rowtype;
begin
 lid=nullif(p_row->>'lead_id','')::uuid;
 if lid is not null then perform 1 from lead_pipeline where id=lid for update; end if;
 insert into codenativex_calendly_bookings(invitee_uri,event_uri,lead_id,company_name,contact_name,client_email,meeting_status,meeting_start_at,meeting_end_at,meeting_link,meeting_timezone,source_event_at)
 values(p_row->>'invitee_uri',p_row->>'event_uri',lid,p_row->>'company_name',p_row->>'contact_name',p_row->>'client_email',p_row->>'meeting_status',nullif(p_row->>'meeting_start_at','')::timestamptz,nullif(p_row->>'meeting_end_at','')::timestamptz,p_row->>'meeting_link',p_row->>'meeting_timezone',(p_row->>'source_event_at')::timestamptz)
 on conflict(invitee_uri) do update set
 lead_id=coalesce(excluded.lead_id,codenativex_calendly_bookings.lead_id),company_name=excluded.company_name,contact_name=excluded.contact_name,
 meeting_status=excluded.meeting_status,meeting_start_at=excluded.meeting_start_at,meeting_end_at=excluded.meeting_end_at,
 meeting_link=excluded.meeting_link,meeting_timezone=excluded.meeting_timezone,source_event_at=excluded.source_event_at,updated_at=now()
 where codenativex_calendly_bookings.source_event_at<=excluded.source_event_at
 and not(codenativex_calendly_bookings.source_event_at=excluded.source_event_at and codenativex_calendly_bookings.meeting_status='cancelled' and excluded.meeting_status='scheduled');
 if lid is not null then
 select * into latest from codenativex_calendly_bookings where lead_id=lid order by (meeting_status='scheduled') desc,source_event_at desc limit 1;
 update lead_pipeline set meeting_status=case when latest.meeting_status='scheduled' then 'booked' else 'cancelled' end,
 meeting_link=latest.meeting_link,meeting_start_at=latest.meeting_start_at,meeting_end_at=latest.meeting_end_at,
 calendar_event_id=latest.event_uri,status=case when latest.meeting_status='scheduled' then 'meeting_booked' else 'meeting_cancelled' end,
 next_follow_up_at=null,next_workflow=null,updated_at=now() where id=lid;
 end if;
 return true;
end; $$;
revoke all on function public.codenativex_save_calendly_booking(jsonb) from public,anon,authenticated;
grant execute on function public.codenativex_save_calendly_booking(jsonb) to service_role;
create or replace function public.codenativex_claim_meeting_handoff() returns setof public.codenativex_calendly_bookings
language plpgsql security definer set search_path=public as $$
begin
 update codenativex_calendly_bookings set handoff_status='needs_review' where handoff_status='sending' and handoff_claimed_at<now()-interval '10 minutes';
 return query with chosen as (
 select id from codenativex_calendly_bookings where handoff_status='pending' and meeting_status='scheduled' and lead_id is not null order by created_at for update skip locked limit 1
 ) update codenativex_calendly_bookings b set handoff_status='sending',handoff_key=gen_random_uuid(),handoff_claimed_at=now() from chosen where b.id=chosen.id returning b.*;
end; $$;
revoke all on function public.codenativex_claim_meeting_handoff() from public,anon,authenticated;
grant execute on function public.codenativex_claim_meeting_handoff() to service_role;
commit;
