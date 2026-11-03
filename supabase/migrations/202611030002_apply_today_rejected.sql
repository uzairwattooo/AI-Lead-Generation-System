begin;
alter table public.project_applications
  drop constraint if exists project_applications_stage_check;
alter table public.project_applications
  add constraint project_applications_stage_check
  check (stage in ('shortlisted','applied','reply','call','paid','rejected'));
commit;
