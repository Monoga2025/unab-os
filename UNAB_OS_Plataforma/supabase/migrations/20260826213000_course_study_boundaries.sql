create table public.course_study_boundaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_source_id text not null check (
    length(course_source_id) between 1 and 128
    and course_source_id ~ '^[A-Za-z0-9_-]+$'
  ),
  boundary_text varchar(4000) not null check (
    length(btrim(boundary_text)) between 1 and 4000
    and boundary_text = btrim(boundary_text)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, course_source_id)
);

alter table public.course_study_boundaries enable row level security;

create policy "read own course study boundaries"
  on public.course_study_boundaries for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "insert own course study boundaries"
  on public.course_study_boundaries for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "update own course study boundaries"
  on public.course_study_boundaries for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "delete own course study boundaries"
  on public.course_study_boundaries for delete to authenticated
  using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.course_study_boundaries to authenticated;
