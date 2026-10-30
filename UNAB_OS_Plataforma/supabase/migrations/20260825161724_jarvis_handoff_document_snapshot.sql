-- Freeze the exact TEMA document and course used by every Jarvis handoff.
-- tema_files is a live catalog row and may legitimately change when Moodle
-- replaces a resource; historical handoffs must never follow that mutation.

alter table public.jarvis_study_handoffs
  add column tema_course_id uuid,
  add column document_storage_bucket text,
  add column document_storage_object_name text,
  add column document_file_name text,
  add column document_content_type text,
  add column document_size_bytes bigint,
  add column document_sha256 text;

update public.jarvis_study_handoffs handoff
set
  tema_course_id = file.course_id,
  document_storage_bucket = file.storage_bucket,
  document_storage_object_name = file.storage_object_name,
  document_file_name = file.file_name,
  document_content_type = file.content_type,
  document_size_bytes = file.size_bytes,
  document_sha256 = file.sha256
from public.tema_files file
where file.id = handoff.file_id
  and file.owner_id = handoff.owner_id;

alter table public.jarvis_study_handoffs
  add constraint jarvis_handoffs_snapshot_course_owner_fkey
    foreign key (tema_course_id, owner_id)
    references public.tema_courses(id, owner_id)
    on update restrict on delete restrict not valid,
  add constraint jarvis_handoffs_snapshot_bucket_check check (
    document_storage_bucket = 'tema-private'
  ) not valid,
  add constraint jarvis_handoffs_snapshot_object_check check (
    length(document_storage_object_name) between 1 and 1024
    and document_storage_object_name like owner_id::text || '/tema/%'
    and position(chr(92) in document_storage_object_name) = 0
    and document_storage_object_name !~ '[[:cntrl:]]'
    and document_storage_object_name !~ '(^|/)\.\.(/|$)'
  ) not valid,
  add constraint jarvis_handoffs_snapshot_file_name_check check (
    length(document_file_name) between 1 and 255
    and document_file_name = btrim(document_file_name)
    and position('/' in document_file_name) = 0
    and position(chr(92) in document_file_name) = 0
    and document_file_name !~ '[[:cntrl:]]'
    and document_file_name not in ('.', '..')
  ) not valid,
  add constraint jarvis_handoffs_snapshot_content_type_check check (
    document_content_type = 'application/pdf'
  ) not valid,
  add constraint jarvis_handoffs_snapshot_size_check check (
    document_size_bytes between 1 and 10000000
  ) not valid,
  add constraint jarvis_handoffs_snapshot_sha256_check check (
    document_sha256 ~ '^[0-9a-f]{64}$'
  ) not valid;

alter table public.jarvis_study_handoffs
  validate constraint jarvis_handoffs_snapshot_course_owner_fkey,
  validate constraint jarvis_handoffs_snapshot_bucket_check,
  validate constraint jarvis_handoffs_snapshot_object_check,
  validate constraint jarvis_handoffs_snapshot_file_name_check,
  validate constraint jarvis_handoffs_snapshot_content_type_check,
  validate constraint jarvis_handoffs_snapshot_size_check,
  validate constraint jarvis_handoffs_snapshot_sha256_check;

alter table public.jarvis_study_handoffs
  alter column tema_course_id set not null,
  alter column document_storage_bucket set not null,
  alter column document_storage_object_name set not null,
  alter column document_file_name set not null,
  alter column document_content_type set not null,
  alter column document_size_bytes set not null,
  alter column document_sha256 set not null;

create index jarvis_handoffs_snapshot_course_idx
  on public.jarvis_study_handoffs (tema_course_id);

create or replace function public.reject_jarvis_handoff_document_snapshot_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tema_course_id is distinct from old.tema_course_id
     or new.document_storage_bucket is distinct from old.document_storage_bucket
     or new.document_storage_object_name is distinct from old.document_storage_object_name
     or new.document_file_name is distinct from old.document_file_name
     or new.document_content_type is distinct from old.document_content_type
     or new.document_size_bytes is distinct from old.document_size_bytes
     or new.document_sha256 is distinct from old.document_sha256 then
    raise exception 'Jarvis handoff document snapshot is immutable.'
      using errcode = '23000';
  end if;
  return new;
end;
$$;

create trigger jarvis_handoffs_document_snapshot_immutable
before update on public.jarvis_study_handoffs
for each row execute function public.reject_jarvis_handoff_document_snapshot_change();

drop policy if exists "insert own jarvis handoffs" on public.jarvis_study_handoffs;
create policy "insert own jarvis handoffs"
  on public.jarvis_study_handoffs for insert to authenticated
  with check (
    (select auth.uid()) = public.jarvis_study_handoffs.owner_id
    and public.jarvis_study_handoffs.status = 'queued'
    and exists (
      select 1
      from public.tema_files file
      where file.id = public.jarvis_study_handoffs.file_id
        and file.owner_id = public.jarvis_study_handoffs.owner_id
        and file.course_id = public.jarvis_study_handoffs.tema_course_id
        and file.storage_bucket = public.jarvis_study_handoffs.document_storage_bucket
        and file.storage_object_name = public.jarvis_study_handoffs.document_storage_object_name
        and file.file_name = public.jarvis_study_handoffs.document_file_name
        and file.content_type = public.jarvis_study_handoffs.document_content_type
        and file.size_bytes = public.jarvis_study_handoffs.document_size_bytes
        and file.sha256 = public.jarvis_study_handoffs.document_sha256
        and file.catalog_visible
        and file.content_type = 'application/pdf'
        and file.size_bytes between 1 and 10000000
    )
    and exists (
      select 1
      from public.telegram_links link
      where link.id = public.jarvis_study_handoffs.telegram_link_id
        and link.owner_id = public.jarvis_study_handoffs.owner_id
        and link.telegram_user_id = public.jarvis_study_handoffs.telegram_recipient_user_id
        and link.telegram_chat_id = public.jarvis_study_handoffs.telegram_recipient_chat_id
        and link.unlinked_at is null
    )
  );

-- The browser may read handoff state, but document locations, integrity data
-- and the frozen course relation are server-only evidence.
revoke select on table public.jarvis_study_handoffs from authenticated;
grant select (
  id,
  owner_id,
  file_id,
  schema_version,
  title,
  subject,
  topic,
  prompt,
  status,
  processing_started_at,
  delivered_at,
  failure_reason,
  created_at,
  updated_at,
  study_session_id,
  telegram_link_id,
  telegram_recipient_user_id,
  telegram_recipient_chat_id
) on public.jarvis_study_handoffs to authenticated;

-- Supabase no longer guarantees automatic Data API grants for newly created
-- projects. Jarvis' server-only bridge needs these explicit privileges in
-- addition to service_role's RLS bypass.
grant select on public.tema_files to service_role;
grant select, insert, update on public.jarvis_study_handoffs to service_role;
grant select, insert on public.jarvis_study_reports to service_role;

comment on column public.jarvis_study_handoffs.tema_course_id is
  'Server-only immutable course snapshot captured when the handoff is queued.';
comment on column public.jarvis_study_handoffs.document_storage_object_name is
  'Server-only immutable private object snapshot; never expose through catalog APIs.';
comment on column public.jarvis_study_handoffs.document_sha256 is
  'Server-only immutable SHA-256 snapshot for the delivered evidence.';
comment on function public.reject_jarvis_handoff_document_snapshot_change() is
  'Rejects any later mutation of a Jarvis handoff document or course snapshot.';
