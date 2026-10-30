create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (display_name is null or (display_name = btrim(display_name) and length(display_name) between 1 and 120))
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  display_name varchar(160) not null,
  normalized_key varchar(160) not null,
  created_by uuid references auth.users(id) on delete set null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (display_name = btrim(display_name) and length(display_name) between 1 and 160),
  check (normalized_key = btrim(normalized_key) and length(normalized_key) between 1 and 160)
);

create table public.professors (
  id uuid primary key default gen_random_uuid(),
  display_name varchar(160) not null,
  normalized_key varchar(160) not null,
  created_by uuid references auth.users(id) on delete set null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (display_name = btrim(display_name) and length(display_name) between 1 and 160),
  check (normalized_key = btrim(normalized_key) and length(normalized_key) between 1 and 160)
);

create unique index subjects_normalized_key_active_key
  on public.subjects (normalized_key) where retired_at is null;
create unique index professors_normalized_key_active_key
  on public.professors (normalized_key) where retired_at is null;
create index idx_subjects_created_by on public.subjects(created_by);
create index idx_professors_created_by on public.professors(created_by);

create table public.class_sections (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id),
  professor_id uuid not null references public.professors(id),
  term varchar(32) not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (term = btrim(term) and length(term) between 1 and 32)
);
create unique index class_sections_subject_professor_term_active_key
  on public.class_sections (subject_id, professor_id, term) where retired_at is null;
create index idx_class_sections_subject_id on public.class_sections(subject_id);
create index idx_class_sections_professor_id on public.class_sections(professor_id);
create index idx_class_sections_created_by on public.class_sections(created_by);

create table public.section_memberships (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.class_sections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (left_at is null or left_at >= joined_at)
);
create unique index section_memberships_section_user_active_key
  on public.section_memberships (section_id, user_id) where left_at is null;
create index idx_section_memberships_section_id on public.section_memberships(section_id);
create index idx_section_memberships_user_id on public.section_memberships(user_id);
create index idx_section_memberships_created_by on public.section_memberships(created_by);

create table public.academic_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.class_sections(id) on delete cascade,
  item_type varchar(16) not null,
  title varchar(240) not null,
  body varchar(5000) not null,
  importance varchar(16) not null default 'normal',
  starts_at timestamptz,
  due_at timestamptz,
  version integer not null default 1,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (item_type in ('note', 'event', 'reminder', 'task', 'evaluation')),
  check (importance in ('low', 'normal', 'high', 'critical')),
  check (title = btrim(title) and length(title) between 1 and 240),
  check (body = btrim(body) and length(body) between 1 and 5000),
  check (version >= 1),
  check ((item_type <> 'event') or starts_at is not null),
  check ((item_type not in ('reminder', 'task', 'evaluation')) or due_at is not null),
  check (due_at is null or starts_at is null or due_at >= starts_at),
  check ((deleted_at is null and deleted_by is null) or (deleted_at is not null and deleted_by is not null))
);
create index idx_academic_items_section_id on public.academic_items(section_id);
create index idx_academic_items_section_active on public.academic_items(section_id) where deleted_at is null;
create index idx_academic_items_created_by on public.academic_items(created_by);
create index idx_academic_items_updated_by on public.academic_items(updated_by);
create index idx_academic_items_deleted_by on public.academic_items(deleted_by);

create table public.academic_item_revisions (
  id uuid primary key default gen_random_uuid(),
  academic_item_id uuid not null,
  section_id uuid not null references public.class_sections(id) on delete restrict,
  version integer not null,
  action varchar(16) not null,
  before_snapshot jsonb,
  after_snapshot jsonb,
  changed_fields text[] not null default '{}'::text[],
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (action in ('insert', 'update', 'soft_delete', 'restore', 'delete')),
  check (version >= 1)
);
create index idx_academic_item_revisions_item_version
  on public.academic_item_revisions(academic_item_id, version desc);
create index idx_academic_item_revisions_section_id on public.academic_item_revisions(section_id);
create index idx_academic_item_revisions_actor_id on public.academic_item_revisions(actor_id);

create or replace function public.normalize_academic_catalog_key(value text)
returns text
language sql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
  select btrim(regexp_replace(
    regexp_replace(
      lower(translate(btrim(value),
        'ÁÀÄÂÃÅáàäâãåÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÑñÇç',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc')),
      '[[:punct:][:space:]]+', ' ', 'g'
    ),
    ' +', ' ', 'g'
  ))
$$;

create or replace function public.enforce_academic_catalog_key()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.display_name := btrim(new.display_name);
  new.normalized_key := public.normalize_academic_catalog_key(new.display_name);
  new.updated_at := now();
  return new;
end;
$$;

create trigger subjects_normalize_key
before insert or update on public.subjects
for each row execute function public.enforce_academic_catalog_key();
create trigger professors_normalize_key
before insert or update on public.professors
for each row execute function public.enforce_academic_catalog_key();

create or replace function public.is_active_section_member(p_section_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.section_memberships membership
    where membership.section_id = p_section_id
      and membership.user_id = p_user_id
      and membership.left_at is null
  )
$$;

create or replace function public.enforce_academic_item_invariants()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.created_by is distinct from old.created_by then
      raise exception using errcode = 'P0001', message = 'academic item creator is immutable';
    end if;
    if new.section_id is distinct from old.section_id then
      raise exception using errcode = 'P0001', message = 'academic item section is immutable';
    end if;
    if new.created_at is distinct from old.created_at then
      raise exception using errcode = 'P0001', message = 'academic item creation timestamp is immutable';
    end if;
    if auth.uid() is null or new.updated_by is distinct from auth.uid() then
      raise exception using errcode = '42501', message = 'academic item updater must be the authenticated user';
    end if;
    new.version := old.version + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger academic_items_enforce_invariants
before update on public.academic_items
for each row execute function public.enforce_academic_item_invariants();

create or replace function public.write_academic_item_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_changed text[] := '{}'::text[];
  v_actor uuid;
  v_item_id uuid;
  v_section_id uuid;
  v_version integer;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_after := to_jsonb(new);
    v_actor := new.created_by;
    v_item_id := new.id;
    v_section_id := new.section_id;
    v_version := new.version;
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_before := to_jsonb(old);
    v_actor := auth.uid();
    v_item_id := old.id;
    v_section_id := old.section_id;
    v_version := old.version;
  else
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_actor := new.updated_by;
    v_item_id := new.id;
    v_section_id := new.section_id;
    v_version := new.version;
    if old.deleted_at is null and new.deleted_at is not null then
      v_action := 'soft_delete';
    elsif old.deleted_at is not null and new.deleted_at is null then
      v_action := 'restore';
    else
      v_action := 'update';
    end if;
    select coalesce(array_agg(key order by key), '{}'::text[])
      into v_changed
      from jsonb_each(v_after) candidate
      where v_before -> candidate.key is distinct from candidate.value;
  end if;

  insert into public.academic_item_revisions (
    academic_item_id, section_id, version, action, before_snapshot, after_snapshot, changed_fields, actor_id
  ) values (
    v_item_id, v_section_id, v_version, v_action, v_before, v_after, v_changed, v_actor
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_academic_catalog_key() from public;
revoke all on function public.enforce_academic_item_invariants() from public;
revoke all on function public.write_academic_item_revision() from public;

create trigger academic_items_write_revision
after insert or update or delete on public.academic_items
for each row execute function public.write_academic_item_revision();

create or replace function public.create_or_get_subject(p_display_name text)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_key text := public.normalize_academic_catalog_key(p_display_name);
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication is required';
  end if;
  select id into v_id from public.subjects
  where normalized_key = v_key and retired_at is null;
  if found then
    return v_id;
  end if;
  insert into public.subjects(display_name, normalized_key, created_by)
  values (btrim(p_display_name), v_key, v_user_id)
  on conflict (normalized_key) where retired_at is null do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.subjects
    where normalized_key = v_key and retired_at is null;
  end if;
  return v_id;
end;
$$;

create or replace function public.create_or_get_professor(p_display_name text)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_key text := public.normalize_academic_catalog_key(p_display_name);
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication is required';
  end if;
  select id into v_id from public.professors
  where normalized_key = v_key and retired_at is null;
  if found then
    return v_id;
  end if;
  insert into public.professors(display_name, normalized_key, created_by)
  values (btrim(p_display_name), v_key, v_user_id)
  on conflict (normalized_key) where retired_at is null do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.professors
    where normalized_key = v_key and retired_at is null;
  end if;
  return v_id;
end;
$$;

create or replace function public.create_or_get_class_section(
  p_subject_id uuid,
  p_professor_id uuid,
  p_term text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication is required';
  end if;
  select id into v_id from public.class_sections
  where subject_id = p_subject_id
    and professor_id = p_professor_id
    and term = btrim(p_term)
    and retired_at is null;
  if v_id is null then
    insert into public.class_sections(subject_id, professor_id, term, created_by)
    values (p_subject_id, p_professor_id, btrim(p_term), v_user_id)
    on conflict (subject_id, professor_id, term) where retired_at is null do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.class_sections
      where subject_id = p_subject_id
        and professor_id = p_professor_id
        and term = btrim(p_term)
        and retired_at is null;
    end if;
  end if;
  insert into public.section_memberships(section_id, user_id, created_by)
  values (v_id, v_user_id, v_user_id)
  on conflict (section_id, user_id) where left_at is null do nothing;
  return v_id;
end;
$$;

create or replace function public.update_academic_item(
  p_item_id uuid,
  p_title text,
  p_body text,
  p_importance text,
  p_starts_at timestamptz,
  p_due_at timestamptz,
  p_expected_version integer
)
returns public.academic_items
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.academic_items;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication is required';
  end if;
  update public.academic_items
  set title = btrim(p_title),
      body = btrim(p_body),
      importance = p_importance,
      starts_at = p_starts_at,
      due_at = p_due_at,
      updated_by = v_user_id,
      version = version + 1
  where id = p_item_id
    and deleted_at is null
    and version = p_expected_version
  returning * into v_item;
  if not found then
    if exists (select 1 from public.academic_items where id = p_item_id) then
      raise exception using errcode = 'ACV01', message = 'academic item version conflict';
    end if;
    raise exception using errcode = 'P0002', message = 'academic item not found';
  end if;
  return v_item;
end;
$$;

create or replace function public.soft_delete_academic_item(p_item_id uuid, p_expected_version integer)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication is required';
  end if;
  if not exists (
    select 1
    from public.academic_items item
    join public.section_memberships membership on membership.section_id = item.section_id
    where item.id = p_item_id
      and membership.user_id = v_user_id
      and membership.left_at is null
  ) then
    raise exception using errcode = '42501', message = 'section membership is required';
  end if;
  update public.academic_items
  set deleted_at = now(), deleted_by = v_user_id, updated_by = v_user_id, version = version + 1
  where id = p_item_id and deleted_at is null and version = p_expected_version;
  if not found then
    select exists(select 1 from public.academic_items where id = p_item_id) into v_exists;
    if v_exists then
      raise exception using errcode = 'ACV01', message = 'academic item version conflict';
    end if;
    raise exception using errcode = 'P0002', message = 'academic item not found';
  end if;
end;
$$;

create or replace function public.restore_academic_item(p_item_id uuid, p_expected_version integer)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication is required';
  end if;
  if not exists (
    select 1
    from public.academic_items item
    join public.section_memberships membership on membership.section_id = item.section_id
    where item.id = p_item_id
      and membership.user_id = v_user_id
      and membership.left_at is null
  ) then
    raise exception using errcode = '42501', message = 'section membership is required';
  end if;
  update public.academic_items
  set deleted_at = null, deleted_by = null, updated_by = v_user_id, version = version + 1
  where id = p_item_id and deleted_at is not null and version = p_expected_version;
  if not found then
    select exists(select 1 from public.academic_items where id = p_item_id) into v_exists;
    if v_exists then
      raise exception using errcode = 'ACV01', message = 'academic item version conflict';
    end if;
    raise exception using errcode = 'P0002', message = 'academic item not found';
  end if;
end;
$$;
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.professors enable row level security;
alter table public.class_sections enable row level security;
alter table public.section_memberships enable row level security;
alter table public.academic_items enable row level security;
alter table public.academic_item_revisions enable row level security;

create policy "read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "insert own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "read active subjects" on public.subjects for select to authenticated using (retired_at is null);
create policy "create subjects" on public.subjects for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "update created subjects" on public.subjects for update to authenticated
  using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);
create policy "read active professors" on public.professors for select to authenticated using (retired_at is null);
create policy "create professors" on public.professors for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "update created professors" on public.professors for update to authenticated
  using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);

create policy "read active sections" on public.class_sections for select to authenticated using (retired_at is null);
create policy "create own sections" on public.class_sections for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "update own sections" on public.class_sections for update to authenticated
  using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);

create policy "read own memberships" on public.section_memberships for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "create own memberships" on public.section_memberships for insert to authenticated
  with check ((select auth.uid()) = user_id and (select auth.uid()) = created_by);
create policy "update own memberships" on public.section_memberships for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own memberships" on public.section_memberships for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "read member academic items" on public.academic_items for select to authenticated
  using (deleted_at is null and (select public.is_active_section_member(section_id)));
create policy "create member academic items" on public.academic_items for insert to authenticated
  with check ((select public.is_active_section_member(section_id))
    and (select auth.uid()) = created_by
    and (select auth.uid()) = updated_by
    and deleted_at is null
    and deleted_by is null);
create policy "update member active academic items" on public.academic_items for update to authenticated
  using (deleted_at is null and (select public.is_active_section_member(section_id)))
  with check (deleted_at is null
    and deleted_by is null
    and (select public.is_active_section_member(section_id)));
create policy "delete member academic items" on public.academic_items for delete to authenticated
  using ((select public.is_active_section_member(section_id)));

create policy "read member academic item revisions" on public.academic_item_revisions for select to authenticated
  using ((select public.is_active_section_member(section_id)));

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.subjects to authenticated;
grant select, insert, update on public.professors to authenticated;
grant select, insert, update on public.class_sections to authenticated;
grant select, insert, update, delete on public.section_memberships to authenticated;
grant select, insert, update, delete on public.academic_items to authenticated;
grant select on public.academic_item_revisions to authenticated;

revoke all on function public.normalize_academic_catalog_key(text) from public;
revoke all on function public.is_active_section_member(uuid, uuid) from public;
revoke all on function public.create_or_get_subject(text) from public;
revoke all on function public.create_or_get_professor(text) from public;
revoke all on function public.create_or_get_class_section(uuid, uuid, text) from public;
revoke all on function public.update_academic_item(uuid, text, text, text, timestamptz, timestamptz, integer) from public;
revoke all on function public.soft_delete_academic_item(uuid, integer) from public;
revoke all on function public.restore_academic_item(uuid, integer) from public;

grant execute on function public.normalize_academic_catalog_key(text) to authenticated;
grant execute on function public.is_active_section_member(uuid, uuid) to authenticated;
grant execute on function public.create_or_get_subject(text) to authenticated;
grant execute on function public.create_or_get_professor(text) to authenticated;
grant execute on function public.create_or_get_class_section(uuid, uuid, text) to authenticated;
grant execute on function public.update_academic_item(uuid, text, text, text, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.soft_delete_academic_item(uuid, integer) to authenticated;
grant execute on function public.restore_academic_item(uuid, integer) to authenticated;