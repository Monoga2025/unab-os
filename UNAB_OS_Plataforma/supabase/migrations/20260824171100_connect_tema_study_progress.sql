-- Connect the private TEMA catalog with study sessions, Jarvis evidence and
-- synchronization history. All public tables remain tenant-isolated by owner.

alter table public.tema_courses
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add column last_access_at timestamptz,
  add column active_state text not null default 'unknown'
    constraint tema_courses_active_state_check check (active_state in ('active','historical','unknown'));

alter table public.tema_activities
  add column opens_at timestamptz,
  add column due_at timestamptz,
  add column completion_state text not null default 'unknown'
    constraint tema_activities_completion_state_check
    check (completion_state in ('unknown','pending','submitted','graded'));

create table public.tema_sync_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null constraint tema_sync_runs_status_check
    check (status in ('running','complete','partial','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  captured_at timestamptz,
  course_count integer not null default 0 constraint tema_sync_runs_course_count_check check (course_count >= 0),
  activity_count integer not null default 0 constraint tema_sync_runs_activity_count_check check (activity_count >= 0),
  file_count integer not null default 0 constraint tema_sync_runs_file_count_check check (file_count >= 0),
  warnings text[] not null default '{}',
  error_message text constraint tema_sync_runs_error_check
    check (error_message is null or length(error_message) <= 1000),
  created_at timestamptz not null default now(),
  constraint tema_sync_runs_lifecycle_check check (
    (status = 'running' and finished_at is null)
    or (status in ('complete','partial','failed') and finished_at is not null)
  ),
  unique (id, owner_id)
);

-- Multiple catalog rows may reference one content-addressed Storage object.
-- Ownership remains enforced by every row and by the object path prefix.
alter table public.tema_files
  drop constraint if exists tema_files_storage_bucket_storage_object_name_key;
create index tema_files_storage_object_idx
  on public.tema_files (storage_bucket, storage_object_name);

alter table public.study_sessions
  add column tema_course_id uuid,
  add column tema_activity_id uuid,
  add constraint study_sessions_tema_course_owner_fkey
    foreign key (tema_course_id, user_id) references public.tema_courses(id, owner_id) on delete restrict,
  add constraint study_sessions_tema_activity_owner_fkey
    foreign key (tema_activity_id, user_id) references public.tema_activities(id, owner_id) on delete restrict;

create table public.study_session_tema_files (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  file_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (session_id, file_id),
  constraint study_session_tema_files_session_owner_fkey
    foreign key (session_id, user_id) references public.study_sessions(id, user_id) on delete cascade,
  constraint study_session_tema_files_file_owner_fkey
    foreign key (file_id, user_id) references public.tema_files(id, owner_id) on delete cascade
);

alter table public.jarvis_study_handoffs
  add column study_session_id uuid,
  add constraint jarvis_handoffs_session_owner_fkey
    foreign key (study_session_id, owner_id) references public.study_sessions(id, user_id) on delete restrict;

create index tema_courses_owner_active_updated_idx
  on public.tema_courses (owner_id, active_state, updated_at desc);
create index tema_activities_owner_due_idx
  on public.tema_activities (owner_id, due_at) where due_at is not null;
create index tema_sync_runs_owner_started_idx
  on public.tema_sync_runs (owner_id, started_at desc);
create index study_sessions_tema_course_idx
  on public.study_sessions (tema_course_id) where tema_course_id is not null;
create index study_sessions_tema_activity_idx
  on public.study_sessions (tema_activity_id) where tema_activity_id is not null;
create index study_session_tema_files_owner_idx on public.study_session_tema_files (user_id);
create index study_session_tema_files_file_idx on public.study_session_tema_files (file_id);
create index jarvis_handoffs_session_idx
  on public.jarvis_study_handoffs (study_session_id) where study_session_id is not null;

alter table public.tema_sync_runs enable row level security;
alter table public.study_session_tema_files enable row level security;

create policy "read own tema sync runs" on public.tema_sync_runs
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "read own study session tema files" on public.study_session_tema_files
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own study session tema files" on public.study_session_tema_files
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "delete own study session tema files" on public.study_session_tema_files
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.tema_sync_runs to authenticated;
grant select, insert, delete on public.study_session_tema_files to authenticated;

-- Register the already imported capture as the initial last-good snapshot so
-- the UI can report its real age before the first Railway run.
insert into public.tema_sync_runs (
  owner_id, status, started_at, finished_at, captured_at,
  course_count, activity_count, file_count, warnings
)
select
  courses.owner_id,
  'complete',
  min(courses.captured_at),
  max(courses.captured_at),
  max(courses.captured_at),
  count(*)::integer,
  (select count(*)::integer from public.tema_activities activities where activities.owner_id = courses.owner_id),
  (select count(*)::integer from public.tema_files files where files.owner_id = courses.owner_id),
  array['Captura inicial importada; la sincronización diaria aún no se había ejecutado.']::text[]
from public.tema_courses courses
group by courses.owner_id;
