-- Additive fix: never remove the unique email constraint or merge different businesses.
begin;
create or replace function public.codenativex_promote_discovery_candidate(
 p_candidate_id uuid,p_reviewed_by text,p_prepare_report boolean default true,p_enable_booking boolean default true
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
 candidate public.lead_discovery_candidates%rowtype;
 existing public.lead_pipeline%rowtype;
 promoted_id uuid;candidate_key text;candidate_email text;attempt integer;
begin
 select * into candidate from public.lead_discovery_candidates where id=p_candidate_id for update;
 if not found then raise exception 'Discovery candidate was not found.';end if;
 if candidate.review_status<>'approved' or candidate.dashboard_deleted_at is not null then raise exception 'An approved, undeleted discovery lead is required.';end if;
 candidate_email:=lower(nullif(btrim(candidate.email),''));
 if candidate_email is null then raise exception 'An email address is required for outreach.';end if;
 candidate_key:=coalesce(nullif(btrim(candidate.lead_key),''),'candidate:'||candidate.id::text);
 -- Serialize this RPC for a normalized email. External writers are covered by ON CONFLICT below.
 perform pg_advisory_xact_lock(hashtextextended('codenativex-promotion:'||candidate_email,0));
 for attempt in 1..2 loop
  select p.* into existing from public.lead_pipeline p
  where p.lead_key=candidate_key or p.discovery_candidate_id=candidate.id or lower(btrim(p.email))=candidate_email
  order by case when p.lead_key=candidate_key or p.discovery_candidate_id=candidate.id then 0 else 1 end,p.updated_at desc nulls last,p.id limit 1 for update;
  if found then
   if existing.lead_key is distinct from candidate_key and existing.discovery_candidate_id is distinct from candidate.id then
    raise exception 'This email is already linked to % (status: %, lead ID: %). Open the existing lead instead. No duplicate was created.',coalesce(existing.company_name,'an existing business'),coalesce(existing.outreach_status,existing.status,'unknown'),existing.id;
   end if;
   if lower(btrim(existing.email)) is distinct from candidate_email then
    raise exception 'The discovered email differs from the existing contact for %. Review the existing lead before outreach.',coalesce(existing.company_name,'this business');
   end if;
   if existing.dashboard_deleted_at is not null or coalesce(existing.do_not_contact,false) or existing.approval_status is distinct from 'approved' or coalesce(existing.duplicate_count,0)>0 then
    raise exception 'Existing lead % is deleted, not approved, duplicated or marked do not contact. Review it directly; its decision was preserved.',existing.id;
   end if;
   if nullif(btrim(existing.gmail_message_id),'') is not null or existing.first_outreach_at is not null or existing.outreach_send_key is not null or coalesce(existing.outreach_status,'')~*'^(sent|sending|initial_email_sent|awaiting_reply|follow_up)' then
    raise exception 'Initial outreach is already sent or claimed for % (lead ID: %). It was not reset or resent.',coalesce(existing.company_name,'this business'),existing.id;
   end if;
   if nullif(existing.next_workflow,'') is not null or existing.audit_status in ('audit_processing','audit_completed') or existing.email_preview_status in ('pending_generation','awaiting_approval','approved','sent') or existing.outreach_status in ('queued','generating','awaiting_approval') then
    raise exception 'Existing lead % is already prepared or processing (status: %). Open its current audit/email; preparation was not restarted.',existing.id,coalesce(existing.outreach_status,existing.status,'unknown');
   end if;
   -- Reuse the same identity without changing approval, contact, timestamps or delivery history here.
   return existing.id;
  end if;
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
      candidate_email,
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
    on conflict do nothing
    returning id into promoted_id;
  if promoted_id is not null then return promoted_id;end if;
 end loop;
 raise exception 'A concurrent record already uses this email or lead identity. Refresh and open the existing lead; no duplicate was created.';
end;$$;
revoke all on function public.codenativex_promote_discovery_candidate(uuid,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.codenativex_promote_discovery_candidate(uuid,text,boolean,boolean) to service_role;
commit;
