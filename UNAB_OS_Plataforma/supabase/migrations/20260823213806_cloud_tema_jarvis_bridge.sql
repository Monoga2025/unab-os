-- Private TEMA catalog, materials and the Universidad OS <-> Jarvis bridge.
-- The browser only receives rows owned by auth.uid(); bytes live in a private bucket.

create table public.tema_courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null check (length(source_id) between 1 and 128 and source_id = btrim(source_id)),
  name text not null check (length(btrim(name)) between 1 and 500),
  access_failed boolean not null default false,
  captured_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (owner_id, source_id),
  unique (id, owner_id)
);

create table public.tema_sections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  source_id text not null check (length(source_id) between 1 and 128 and source_id = btrim(source_id)),
  title text not null check (length(btrim(title)) between 1 and 500),
  position integer not null,
  captured_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint tema_sections_course_owner_fkey foreign key (course_id, owner_id)
    references public.tema_courses(id, owner_id) on delete cascade,
  unique (owner_id, course_id, source_id),
  unique (id, owner_id)
);

create table public.tema_activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  section_id uuid not null,
  source_id text not null check (length(source_id) between 1 and 300 and source_id = btrim(source_id)),
  name text not null check (length(btrim(name)) between 1 and 1000),
  module_type text not null check (length(btrim(module_type)) between 1 and 160),
  availability_text text[] not null default '{}',
  candidate_names text[] not null default '{}',
  captured_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint tema_activities_course_owner_fkey foreign key (course_id, owner_id)
    references public.tema_courses(id, owner_id) on delete cascade,
  constraint tema_activities_section_owner_fkey foreign key (section_id, owner_id)
    references public.tema_sections(id, owner_id) on delete cascade,
  unique (owner_id, section_id, source_id),
  unique (id, owner_id)
);

create table public.tema_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  candidate_id text not null check (candidate_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  course_id uuid not null,
  section_id uuid not null,
  activity_name text not null check (length(btrim(activity_name)) between 1 and 1000),
  file_name text not null check (
    length(file_name) between 1 and 255 and file_name = btrim(file_name)
    and position('/' in file_name) = 0 and position(chr(92) in file_name) = 0
    and file_name !~ '[[:cntrl:]]' and file_name not in ('.', '..')
  ),
  file_type text not null check (length(btrim(file_type)) between 1 and 100),
  content_type text not null check (length(btrim(content_type)) between 1 and 160),
  size_bytes bigint not null check (size_bytes between 1 and 104857600),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_bucket text not null default 'tema-private' check (storage_bucket = 'tema-private'),
  storage_object_name text not null,
  captured_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint tema_files_course_owner_fkey foreign key (course_id, owner_id)
    references public.tema_courses(id, owner_id) on delete cascade,
  constraint tema_files_section_owner_fkey foreign key (section_id, owner_id)
    references public.tema_sections(id, owner_id) on delete cascade,
  constraint tema_files_owner_object_check check (
    length(storage_object_name) between 1 and 1024
    and storage_object_name like owner_id::text || '/tema/%'
    and position(chr(92) in storage_object_name) = 0
    and storage_object_name !~ '[[:cntrl:]]'
    and storage_object_name !~ '(^|/)\.\.(/|$)'
  ),
  unique (owner_id, candidate_id),
  unique (storage_bucket, storage_object_name),
  unique (id, owner_id)
);

create table public.jarvis_study_handoffs (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid not null,
  schema_version text not null default 'unab-os.study-handoff.v1'
    check (schema_version = 'unab-os.study-handoff.v1'),
  title text not null check (length(btrim(title)) between 1 and 180),
  subject text not null check (length(btrim(subject)) between 1 and 180),
  topic text not null check (length(btrim(topic)) between 1 and 180),
  prompt text not null check (length(btrim(prompt)) between 1 and 8000),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'delivered', 'reviewed', 'failed')),
  processing_started_at timestamptz,
  delivered_at timestamptz,
  failure_reason text check (failure_reason is null or length(failure_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jarvis_handoffs_file_owner_fkey foreign key (file_id, owner_id)
    references public.tema_files(id, owner_id) on delete restrict,
  constraint jarvis_handoffs_status_timestamps_check check (
    (status = 'queued' and processing_started_at is null and delivered_at is null)
    or (status = 'processing' and processing_started_at is not null and delivered_at is null)
    or (status in ('delivered', 'reviewed') and processing_started_at is not null and delivered_at is not null)
    or status = 'failed'
  ),
  unique (id, owner_id)
);

create table public.jarvis_study_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  handoff_id uuid not null,
  schema_version text not null default 'unab-os.study-report-envelope.v1'
    check (schema_version = 'unab-os.study-report-envelope.v1'),
  report jsonb not null check (
    jsonb_typeof(report) = 'object'
    and report->>'schemaVersion' = 'unab-os.study-report.v1'
    and report->>'handoffId' = handoff_id::text
  ),
  received_at timestamptz not null default now(),
  constraint jarvis_reports_handoff_owner_fkey foreign key (handoff_id, owner_id)
    references public.jarvis_study_handoffs(id, owner_id) on delete cascade,
  unique (owner_id, handoff_id)
);

create index tema_courses_owner_updated_idx on public.tema_courses (owner_id, updated_at desc);
create index tema_sections_course_position_idx on public.tema_sections (course_id, position, id);
create index tema_sections_owner_idx on public.tema_sections (owner_id);
create index tema_activities_course_idx on public.tema_activities (course_id);
create index tema_activities_section_idx on public.tema_activities (section_id);
create index tema_activities_owner_idx on public.tema_activities (owner_id);
create index tema_files_course_idx on public.tema_files (course_id);
create index tema_files_section_idx on public.tema_files (section_id);
create index tema_files_owner_updated_idx on public.tema_files (owner_id, updated_at desc);
create index jarvis_handoffs_file_idx on public.jarvis_study_handoffs (file_id);
create index jarvis_handoffs_owner_status_created_idx
  on public.jarvis_study_handoffs (owner_id, status, created_at);
create index jarvis_reports_handoff_idx on public.jarvis_study_reports (handoff_id);
create index jarvis_reports_owner_received_idx on public.jarvis_study_reports (owner_id, received_at desc);

alter table public.tema_courses enable row level security;
alter table public.tema_sections enable row level security;
alter table public.tema_activities enable row level security;
alter table public.tema_files enable row level security;
alter table public.jarvis_study_handoffs enable row level security;
alter table public.jarvis_study_reports enable row level security;

create policy "read own tema courses" on public.tema_courses for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "read own tema sections" on public.tema_sections for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "read own tema activities" on public.tema_activities for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "read own tema files" on public.tema_files for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "read own jarvis handoffs" on public.jarvis_study_handoffs for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "insert own jarvis handoffs" on public.jarvis_study_handoffs for insert to authenticated
  with check ((select auth.uid()) = owner_id and status = 'queued');
create policy "read own jarvis reports" on public.jarvis_study_reports for select to authenticated
  using ((select auth.uid()) = owner_id);

grant select on public.tema_courses, public.tema_sections, public.tema_activities, public.tema_files to authenticated;
grant select, insert on public.jarvis_study_handoffs to authenticated;
grant select on public.jarvis_study_reports to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('tema-private', 'tema-private', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "read own private tema objects" on storage.objects for select to authenticated
  using (bucket_id = 'tema-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "insert own private tema objects" on storage.objects for insert to authenticated
  with check (bucket_id = 'tema-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "update own private tema objects" on storage.objects for update to authenticated
  using (bucket_id = 'tema-private' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'tema-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own private tema objects" on storage.objects for delete to authenticated
  using (bucket_id = 'tema-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
