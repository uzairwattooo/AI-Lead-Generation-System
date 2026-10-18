begin;
create table if not exists public.automation_discovery_jobs (
 id uuid primary key default gen_random_uuid(), category text not null,city text not null,country text not null,
 kind text not null check(kind in ('business','buyer_request')),requested_count integer not null check(requested_count between 1 and 10),
 status text not null default 'queued' check(status in ('queued','running','completed','failed')),
 error text,result_count integer not null default 0,created_by text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.automation_opportunities (
 id uuid primary key default gen_random_uuid(),job_id uuid references public.automation_discovery_jobs(id),
 kind text not null check(kind in ('business','buyer_request')),company_name text not null,category text not null,city text not null,country text not null,
 website text not null,source_url text not null,excerpt text not null,source_key text not null unique,
 email text,source_verified boolean not null default false,score integer not null default 0,
 signals jsonb not null default '[]',capabilities jsonb not null default '[]',reason text not null,
 review_status text not null default 'pending' check(review_status in ('pending','approved','rejected')),
 do_not_contact boolean not null default false,last_reply text,reply_intent text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.automation_outbox (
 id uuid primary key default gen_random_uuid(),opportunity_id uuid not null references public.automation_opportunities(id),
 kind text not null check(kind in ('initial','booking_reply')),reply_key text not null default '',
 subject text not null,body text not null,email text not null,
 status text not null default 'draft' check(status in ('draft','queued','sending','sent','failed','cancelled')),
 approved_at timestamptz,send_key uuid,smtp_authorized_at timestamptz,message_id text,error text,sent_at timestamptz,
 notification_status text not null default 'not_recorded',notification_error text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(opportunity_id,kind,reply_key)
);
create table if not exists public.automation_reply_events (
 message_id text primary key,opportunity_id uuid not null references public.automation_opportunities(id),
 sender text not null,body text not null,intent text not null,received_at timestamptz not null,processed_at timestamptz
);
create table if not exists public.automation_suppressions (
 email text primary key,reason text not null,created_at timestamptz not null default now()
);
create table if not exists public.automation_initial_contact_claims (
 email text primary key, channel text not null, record_id uuid not null,created_at timestamptz not null default now()
);
alter table public.automation_initial_contact_claims enable row level security;
revoke all on public.automation_initial_contact_claims from anon,authenticated;
grant select,insert,update,delete on public.automation_initial_contact_claims to service_role;
create or replace function public.automation_guard_website_contact() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.outreach_send_key is not null and new.outreach_send_key is distinct from old.outreach_send_key then
  if exists(select 1 from automation_suppressions where lower(email)=lower(new.email)) then raise exception 'This email is marked do not contact.';end if;
  insert into automation_initial_contact_claims(email,channel,record_id) values(lower(new.email),'website',new.id) on conflict do nothing;
  if not exists(select 1 from automation_initial_contact_claims where email=lower(new.email) and channel='website' and record_id=new.id) then raise exception 'First contact is already claimed in another campaign.';end if;
 end if;return new;
end$$;
drop trigger if exists automation_website_contact_guard on public.lead_pipeline;
create trigger automation_website_contact_guard before update of outreach_send_key on public.lead_pipeline for each row execute function public.automation_guard_website_contact();
create index if not exists automation_jobs_queue on public.automation_discovery_jobs(status,created_at);
create unique index if not exists automation_initial_email_claim on public.automation_outbox(lower(email)) where kind='initial' and send_key is not null;
create index if not exists automation_outbox_queue on public.automation_outbox(status,created_at);
create index if not exists automation_prospects_email on public.automation_opportunities(lower(email));
create index if not exists automation_review on public.automation_opportunities(review_status,updated_at desc);
do $$declare t text;begin foreach t in array array['automation_discovery_jobs','automation_opportunities','automation_outbox','automation_reply_events','automation_suppressions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;end$$;
create or replace function public.automation_claim_job() returns setof public.automation_discovery_jobs
language sql security definer set search_path=public,pg_temp as $$
 update automation_discovery_jobs set status='running',updated_at=now() where id=(select id from automation_discovery_jobs where status='queued' order by created_at for update skip locked limit 1) returning *;
$$;
-- The queued row is locked before changing to sending. Sending rows are NEVER automatically retried.
create or replace function public.automation_claim_email() returns setof public.automation_outbox
language plpgsql security definer set search_path=public,pg_temp as $$
declare selected uuid;begin
 update automation_outbox o set status='cancelled',error='Contact is blocked, no longer approved, or already claimed in another campaign.',updated_at=now()
 from automation_opportunities p where p.id=o.opportunity_id and o.status='queued' and (
 p.do_not_contact or p.review_status<>'approved' or not p.source_verified or p.email is null or lower(p.email)<>lower(o.email)
 or exists(select 1 from automation_suppressions s where lower(s.email)=lower(o.email))
 or exists(select 1 from lead_pipeline l where lower(l.email)=lower(o.email) and (coalesce(l.do_not_contact,false) or (o.kind='initial' and (l.gmail_message_id is not null or l.first_outreach_at is not null or l.outreach_send_key is not null))))
 or (o.kind='initial' and exists(select 1 from automation_initial_contact_claims c where c.email=lower(o.email)))
 );
 select o.id into selected from automation_outbox o join automation_opportunities p on p.id=o.opportunity_id
 where o.status='queued' and o.approved_at is not null and o.send_key is null and o.message_id is null
 and p.kind='business' and p.review_status='approved' and p.source_verified and not p.do_not_contact and lower(p.email)=lower(o.email)
 and not exists(select 1 from automation_suppressions s where lower(s.email)=lower(o.email))
 and not exists(select 1 from lead_pipeline l where lower(l.email)=lower(o.email) and (coalesce(l.do_not_contact,false) or (o.kind='initial' and (l.gmail_message_id is not null or l.first_outreach_at is not null or l.outreach_send_key is not null))))
 and (o.kind<>'initial' or not exists(select 1 from automation_initial_contact_claims c where c.email=lower(o.email)))
 and (o.kind<>'initial' or not exists(select 1 from automation_outbox prior where prior.id<>o.id and lower(prior.email)=lower(o.email) and prior.kind='initial' and (prior.status in ('sending','sent') or prior.send_key is not null)))
 order by o.created_at for update of o skip locked limit 1;
 if selected is not null then
  if exists(select 1 from automation_outbox where id=selected and kind='initial') then
   insert into automation_initial_contact_claims(email,channel,record_id) select lower(email),'automation',id from automation_outbox where id=selected on conflict do nothing;
   if not exists(select 1 from automation_initial_contact_claims c join automation_outbox o on c.email=lower(o.email) where o.id=selected and c.channel='automation' and c.record_id=selected) then return;end if;
  end if;
  return query update automation_outbox set status='sending',send_key=gen_random_uuid(),updated_at=now() where id=selected returning *;end if;
end$$;
revoke all on function public.automation_guard_website_contact() from public,anon,authenticated;
revoke all on function public.automation_claim_job(),public.automation_claim_email() from public,anon,authenticated;
grant execute on function public.automation_claim_job(),public.automation_claim_email() to service_role;
commit;
