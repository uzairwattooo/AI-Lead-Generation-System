begin;
alter table public.lead_pipeline add column if not exists last_follow_up_subject text;
alter table public.lead_pipeline add column if not exists outreach_video_url text;
alter table public.lead_pipeline add column if not exists outreach_video_sent_at timestamptz;
alter table public.codenativex_reply_actions drop constraint if exists codenativex_reply_actions_action_check;
alter table public.codenativex_reply_actions add constraint codenativex_reply_actions_action_check
 check (action in ('report','video','report_and_video','booking'));
-- Defaults required when a reviewed discovery candidate is promoted.
alter table public.lead_pipeline
 alter column phone_validation_status set default 'not_checked',
 alter column need_signals set default '[]'::jsonb,
 alter column personalization_points set default '[]'::jsonb,
 alter column meeting_slot_options set default '[]'::jsonb,
 alter column contact_evidence set default '{}'::jsonb,
 alter column email_discovery_evidence set default '{}'::jsonb,
 alter column email_verification_details set default '{}'::jsonb,
 alter column audit_findings set default '[]'::jsonb,
 alter column audit_evidence set default '{}'::jsonb;
create or replace function public.codenativex_claim_reply_action() returns setof public.codenativex_reply_actions
language plpgsql security definer set search_path = public as $$
begin
 update codenativex_reply_actions a set status='cancelled',error_message='Lead was rejected or contact stopped.'
 from lead_pipeline l where a.lead_id=l.id and a.status='pending' and (l.approval_status<>'approved' or coalesce(l.do_not_contact,false)=true);
 -- A crash around Gmail send is ambiguous. Never resend it automatically.
 update codenativex_reply_actions set status='needs_review',error_message='Stale claim; check Gmail before retrying.'
 where status in ('processing','sending') and claimed_at < now()-interval '10 minutes';
 update lead_pipeline l set status='reply_needs_review',human_review_required=true,next_workflow=null,next_follow_up_at=null,updated_at=now()
 where l.status in ('report_requested','meeting_requested','video_requested','report_and_video_requested') and exists(
 select 1 from codenativex_reply_actions a where a.lead_id=l.id and a.reply_message_id=l.reply_message_id and a.status='needs_review');
 return query
 with chosen as (
  select a.id from codenativex_reply_actions a join lead_pipeline l on l.id=a.lead_id
  where a.status='pending' and coalesce(l.do_not_contact,false)=false and l.approval_status='approved'
   and l.reply_message_id=a.reply_message_id and l.status in ('report_requested','meeting_requested','video_requested','report_and_video_requested')
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
   audit_report_sent_at=case when a.action in ('report','report_and_video') then now() else audit_report_sent_at end,
   outreach_video_sent_at=case when a.action in ('video','report_and_video') then now() else outreach_video_sent_at end,
   booking_link_sent_at=case when a.action='booking' then now() else booking_link_sent_at end,
   status=case when a.action='report' then 'report_shared' when a.action='video' then 'video_shared' when a.action='report_and_video' then 'report_and_video_shared' else 'awaiting_booking' end,
   next_follow_up_at=null,next_workflow=null,human_review_required=false,updated_at=now()
  where id=a.lead_id and reply_message_id=a.reply_message_id and coalesce(do_not_contact,false)=false and approval_status='approved'
   and status in ('report_requested','meeting_requested','video_requested','report_and_video_requested');
 else
  update lead_pipeline set status='reply_needs_review',human_review_required=true,next_follow_up_at=null,next_workflow=null,updated_at=now()
  where id=a.lead_id and reply_message_id=a.reply_message_id and status in ('report_requested','meeting_requested','video_requested','report_and_video_requested');
 end if;
 return true;
end; $$;
revoke all on function public.codenativex_finish_reply_action(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.codenativex_finish_reply_action(uuid,uuid,text,text) to service_role;
commit;
