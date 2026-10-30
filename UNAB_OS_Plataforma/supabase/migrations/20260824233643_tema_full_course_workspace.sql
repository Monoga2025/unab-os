-- Complete, read-only TEMA workspace. Passwords are never persisted. The
-- mobile token envelope is server-only and can only be read by the service
-- role used by the Python synchronizer.

alter table public.tema_courses
  add column short_name text,
  add column official_url text,
  add column summary_text text,
  add column format text;

alter table public.tema_courses
  add constraint tema_courses_official_url_check check (
    official_url is null or (
      length(official_url) <= 2048
      and official_url ~ '^https://tema\.unab\.edu\.co/course/view\.php\?'
    )
  ),
  add constraint tema_courses_summary_check check (summary_text is null or length(summary_text) <= 50000);

alter table public.tema_sections
  add column summary_text text,
  add column visible boolean not null default true;

alter table public.tema_sections
  add constraint tema_sections_summary_check check (summary_text is null or length(summary_text) <= 50000);

alter table public.tema_activities
  add column official_url text,
  add column description_text text,
  add column visible boolean not null default true;

alter table public.tema_activities
  add constraint tema_activities_official_url_check check (
    official_url is null or (
      length(official_url) <= 2048
      and official_url ~ '^https://tema\.unab\.edu\.co/'
    )
  ),
  add constraint tema_activities_description_check check (
    description_text is null or length(description_text) <= 50000
  );

alter table public.tema_files
  add column activity_id uuid,
  add column source_url text;

alter table public.tema_files
  add constraint tema_files_activity_owner_fkey foreign key (activity_id, owner_id)
    references public.tema_activities(id, owner_id) on delete cascade,
  add constraint tema_files_source_url_check check (
    source_url is null or (
      length(source_url) <= 4096
      and source_url ~ '^https://tema\.unab\.edu\.co/'
      and source_url !~* '([?&](token|wstoken)=)'
    )
  );

create table public.tema_grade_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  source_id text not null check (length(btrim(source_id)) between 1 and 300),
  item_name text not null check (length(btrim(item_name)) between 1 and 1000),
  item_type text not null check (length(btrim(item_type)) between 1 and 160),
  module_type text,
  grade_display text,
  grade_raw numeric,
  grade_min numeric,
  grade_max numeric,
  feedback_text text,
  graded_at timestamptz,
  official_url text,
  captured_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint tema_grade_items_course_owner_fkey foreign key (course_id, owner_id)
    references public.tema_courses(id, owner_id) on delete cascade,
  constraint tema_grade_items_display_check check (grade_display is null or length(grade_display) <= 500),
  constraint tema_grade_items_feedback_check check (feedback_text is null or length(feedback_text) <= 50000),
  constraint tema_grade_items_url_check check (
    official_url is null or (
      length(official_url) <= 2048
      and official_url ~ '^https://tema\.unab\.edu\.co/grade/'
    )
  ),
  unique (owner_id, course_id, source_id),
  unique (id, owner_id)
);

create table public.tema_announcements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  source_id text not null check (length(btrim(source_id)) between 1 and 300),
  title text not null check (length(btrim(title)) between 1 and 1000),
  excerpt text,
  author_name text,
  posted_at timestamptz,
  official_url text not null,
  captured_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint tema_announcements_course_owner_fkey foreign key (course_id, owner_id)
    references public.tema_courses(id, owner_id) on delete cascade,
  constraint tema_announcements_excerpt_check check (excerpt is null or length(excerpt) <= 10000),
  constraint tema_announcements_url_check check (
    length(official_url) <= 2048 and official_url ~ '^https://tema\.unab\.edu\.co/'
  ),
  unique (owner_id, course_id, source_id),
  unique (id, owner_id)
);

create table public.tema_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  moodle_user_id bigint not null check (moodle_user_id > 0),
  username_hint text,
  token_envelope text not null check (length(token_envelope) between 40 and 4096),
  token_fingerprint text not null check (token_fingerprint ~ '^[0-9a-f]{64}$'),
  status text not null default 'connected' check (status in ('connected','invalid','revoked')),
  sync_requested_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text check (last_error is null or length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tema_files_activity_idx on public.tema_files (activity_id) where activity_id is not null;
create index tema_grade_items_owner_course_idx on public.tema_grade_items (owner_id, course_id, graded_at desc);
create index tema_grade_items_course_idx on public.tema_grade_items (course_id);
create index tema_announcements_owner_course_posted_idx on public.tema_announcements (owner_id, course_id, posted_at desc);
create index tema_announcements_course_idx on public.tema_announcements (course_id);
create index tema_connections_sync_requested_idx on public.tema_connections (status, sync_requested_at);

alter table public.tema_grade_items enable row level security;
alter table public.tema_announcements enable row level security;
alter table public.tema_connections enable row level security;

create policy "read own tema grade items" on public.tema_grade_items
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "read own tema announcements" on public.tema_announcements
  for select to authenticated using ((select auth.uid()) = owner_id);

-- There is deliberately no authenticated policy or grant for
-- tema_connections: token ciphertext is server-only.
grant select on public.tema_grade_items, public.tema_announcements to authenticated;
revoke all on public.tema_connections from anon, authenticated;
