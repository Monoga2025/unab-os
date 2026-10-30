-- Personal study documents and sessions. Uploaded bytes remain in the existing private attempt-work bucket.
create table public.study_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null constraint study_documents_kind_check check (kind in ('material', 'rubric')),
  status text not null default 'pending' constraint study_documents_status_check check (status in ('pending', 'ready', 'failed')),
  file_name text not null constraint study_documents_file_name_check check (
    length(file_name) between 1 and 255
    and file_name = btrim(file_name)
    and position('/' in file_name) = 0
    and position(chr(92) in file_name) = 0
    and file_name !~ '[[:cntrl:]]'
    and file_name not in ('.', '..')
  ),
  mime_type text not null constraint study_documents_mime_type_check check (mime_type in ('application/pdf','text/plain')),
  size_bytes bigint not null constraint study_documents_size_check check (size_bytes between 1 and 10000000),
  storage_bucket text not null default 'attempt-work' constraint study_documents_bucket_check check (storage_bucket = 'attempt-work'),
  storage_object_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_documents_owner_object_check check (
    length(storage_object_name) between 1 and 1024
    and storage_object_name = btrim(storage_object_name)
    and storage_object_name like user_id::text || '/study-documents/%'
    and position(chr(92) in storage_object_name) = 0
    and storage_object_name !~ '[[:cntrl:]]'
    and storage_object_name !~ '(^|/)\.\.(/|$)'
  ),
  constraint study_documents_storage_object_unique unique (storage_bucket, storage_object_name),
  constraint study_documents_id_owner_unique unique (id, user_id)
);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null constraint study_sessions_title_check check (length(btrim(title)) between 1 and 160),
  status text not null default 'planned' constraint study_sessions_status_check check (status in ('planned','active','completed','cancelled')),
  planned_for timestamptz not null,
  target_minutes smallint constraint study_sessions_target_minutes_check check (target_minutes between 5 and 240),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_lifecycle_check check (
    (status='planned' and started_at is null and completed_at is null and cancelled_at is null)
    or (status='active' and started_at is not null and completed_at is null and cancelled_at is null)
    or (status='completed' and started_at is not null and completed_at is not null and cancelled_at is null)
    or (status='cancelled' and completed_at is null and cancelled_at is not null)
  ),
  constraint study_sessions_terminal_order_check check (
    (completed_at is null or completed_at >= started_at)
    and (cancelled_at is null or cancelled_at >= started_at)
  ),
  constraint study_sessions_id_owner_unique unique (id, user_id)
);
create table public.study_session_documents (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  document_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (session_id, document_id),
  constraint study_session_documents_session_owner_fkey foreign key (session_id,user_id) references public.study_sessions(id,user_id) on delete cascade,
  constraint study_session_documents_document_owner_fkey foreign key (document_id,user_id) references public.study_documents(id,user_id) on delete cascade
);
create index study_documents_owner_created_idx on public.study_documents (user_id, created_at desc);
create index study_sessions_owner_planned_idx on public.study_sessions (user_id, planned_for desc);
create index study_session_documents_owner_idx on public.study_session_documents (user_id);
create index study_session_documents_document_idx on public.study_session_documents (document_id);
alter table public.study_documents enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_session_documents enable row level security;
create policy "read own study documents" on public.study_documents for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own study documents" on public.study_documents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own study documents" on public.study_documents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own study documents" on public.study_documents for delete to authenticated using ((select auth.uid()) = user_id);
create policy "read own study sessions" on public.study_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own study sessions" on public.study_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own study sessions" on public.study_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own study sessions" on public.study_sessions for delete to authenticated using ((select auth.uid()) = user_id);
create policy "read own study session documents" on public.study_session_documents for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own study session documents" on public.study_session_documents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "delete own study session documents" on public.study_session_documents for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.study_documents, public.study_sessions to authenticated;
grant select, insert, delete on public.study_session_documents to authenticated;;
