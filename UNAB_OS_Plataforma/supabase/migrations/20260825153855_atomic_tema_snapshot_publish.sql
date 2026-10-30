-- Publish a complete TEMA catalog in one database transaction. Source rows
-- absent from the new capture remain available to historical foreign keys but
-- stop participating in the live catalog.

alter table public.tema_courses add column catalog_visible boolean not null default true;
alter table public.tema_sections add column catalog_visible boolean not null default true;
alter table public.tema_activities add column catalog_visible boolean not null default true;
alter table public.tema_files add column catalog_visible boolean not null default true;
alter table public.tema_grade_items add column catalog_visible boolean not null default true;
alter table public.tema_announcements add column catalog_visible boolean not null default true;
alter table public.tema_connections add column last_attempted_at timestamptz;

-- Moodle bytes are source evidence. Authenticated clients receive them only
-- through the owner-scoped server route; only service_role may mutate them.
drop policy if exists "read own private tema objects" on storage.objects;
drop policy if exists "insert own private tema objects" on storage.objects;
drop policy if exists "update own private tema objects" on storage.objects;
drop policy if exists "delete own private tema objects" on storage.objects;

create index tema_courses_owner_live_idx on public.tema_courses (owner_id, name) where catalog_visible;
create index tema_sections_owner_live_idx on public.tema_sections (owner_id, course_id, position) where catalog_visible;
create index tema_activities_owner_live_idx on public.tema_activities (owner_id, course_id) where catalog_visible;
create index tema_files_owner_live_idx on public.tema_files (owner_id, course_id) where catalog_visible;
create index tema_grade_items_owner_live_idx on public.tema_grade_items (owner_id, course_id) where catalog_visible;
create index tema_announcements_owner_live_idx on public.tema_announcements (owner_id, course_id, posted_at desc) where catalog_visible;

create or replace function public.publish_tema_snapshot(
  p_owner_id uuid,
  p_token_fingerprint text,
  p_run_id uuid,
  p_moodle_user_id bigint,
  p_captured_at timestamptz,
  p_status text,
  p_warnings jsonb,
  p_complete_scopes jsonb,
  p_courses jsonb,
  p_sections jsonb,
  p_activities jsonb,
  p_files jsonb,
  p_grades jsonb,
  p_announcements jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_rows integer;
  v_all_rows jsonb;
  v_expected_status text;
begin
  if p_status is null or p_status not in ('complete', 'partial') then
    raise exception 'invalid TEMA publish status';
  end if;
  if p_moodle_user_id is null or p_moodle_user_id < 1 then
    raise exception 'invalid Moodle user';
  end if;
  if p_token_fingerprint is null or p_token_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid TEMA token fingerprint';
  end if;
  if p_captured_at is null or p_captured_at > now() + interval '5 minutes' then
    raise exception 'invalid TEMA capture timestamp';
  end if;
  if jsonb_typeof(p_warnings) is distinct from 'array'
    or jsonb_typeof(p_complete_scopes) is distinct from 'object'
    or jsonb_typeof(p_courses) is distinct from 'array'
    or jsonb_typeof(p_sections) is distinct from 'array'
    or jsonb_typeof(p_activities) is distinct from 'array'
    or jsonb_typeof(p_files) is distinct from 'array'
    or jsonb_typeof(p_grades) is distinct from 'array'
    or jsonb_typeof(p_announcements) is distinct from 'array' then
    raise exception 'invalid TEMA snapshot payload';
  end if;
  if jsonb_typeof(p_complete_scopes->'courses') is distinct from 'boolean'
    or jsonb_typeof(p_complete_scopes->'sections') is distinct from 'boolean'
    or jsonb_typeof(p_complete_scopes->'activities') is distinct from 'boolean'
    or jsonb_typeof(p_complete_scopes->'files') is distinct from 'boolean'
    or jsonb_typeof(p_complete_scopes->'grades') is distinct from 'boolean'
    or jsonb_typeof(p_complete_scopes->'announcements') is distinct from 'boolean' then
    raise exception 'invalid TEMA completeness map';
  end if;
  v_expected_status := 'partial';
  if jsonb_array_length(p_warnings) = 0
    and (p_complete_scopes->>'courses')::boolean
    and (p_complete_scopes->>'sections')::boolean
    and (p_complete_scopes->>'activities')::boolean
    and (p_complete_scopes->>'files')::boolean
    and (p_complete_scopes->>'grades')::boolean
    and (p_complete_scopes->>'announcements')::boolean then
    v_expected_status := 'complete';
  end if;
  if p_status <> v_expected_status then
    raise exception 'TEMA publish status does not match snapshot completeness';
  end if;
  if not exists (
    select 1 from public.tema_sync_runs
    where id = p_run_id and owner_id = p_owner_id and status = 'running'
  ) then
    raise exception 'TEMA sync run does not belong to owner or is not running';
  end if;
  perform 1
  from public.tema_connections connection
  where connection.owner_id = p_owner_id
    and connection.status = 'connected'
    and connection.token_fingerprint = p_token_fingerprint
  for update;
  if not found then
    raise exception 'TEMA connection was revoked or replaced';
  end if;
  if exists (
    select 1
    from public.tema_sync_runs published
    where published.owner_id = p_owner_id
      and published.status in ('complete', 'partial')
      and published.captured_at > p_captured_at
  ) then
    raise exception 'newer TEMA capture is already published';
  end if;

  -- Owner ids are assigned by this function. Reject a contradictory owner if
  -- a caller nevertheless includes one inside any source row.
  v_all_rows := p_courses || p_sections || p_activities || p_files || p_grades || p_announcements;
  if exists (
    select 1
    from jsonb_array_elements(v_all_rows) item
    where item ? 'owner_id' and item->>'owner_id' is distinct from p_owner_id::text
  ) then
    raise exception 'TEMA snapshot row owner mismatch';
  end if;

  insert into public.tema_courses (
    owner_id, source_id, name, short_name, official_url, summary_text, format,
    access_failed, category_name, progress_percent, starts_at, ends_at,
    last_access_at, active_state, captured_at, updated_at, catalog_visible
  )
  select
    p_owner_id, x.source_id, x.name, x.short_name, x.official_url,
    x.summary_text, x.format, x.access_failed, x.category_name,
    x.progress_percent, x.starts_at, x.ends_at, x.last_access_at,
    x.active_state, p_captured_at, p_captured_at, true
  from jsonb_to_recordset(p_courses) as x(
    source_id text, name text, short_name text, official_url text,
    summary_text text, format text, access_failed boolean,
    category_name text, progress_percent numeric, starts_at timestamptz,
    ends_at timestamptz, last_access_at timestamptz, active_state text
  )
  on conflict (owner_id, source_id) do update set
    name = excluded.name,
    short_name = excluded.short_name,
    official_url = excluded.official_url,
    summary_text = excluded.summary_text,
    format = excluded.format,
    access_failed = excluded.access_failed,
    category_name = excluded.category_name,
    progress_percent = excluded.progress_percent,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    last_access_at = excluded.last_access_at,
    active_state = excluded.active_state,
    captured_at = excluded.captured_at,
    updated_at = excluded.updated_at,
    catalog_visible = true;
  get diagnostics v_rows = row_count;
  if v_rows <> jsonb_array_length(p_courses) then
    raise exception 'TEMA course publish count mismatch';
  end if;

  insert into public.tema_sections (
    owner_id, course_id, source_id, title, position, summary_text, visible,
    captured_at, updated_at, catalog_visible
  )
  select
    p_owner_id, course.id, x.source_id, x.title, x.position,
    x.summary_text, x.visible, p_captured_at, p_captured_at, true
  from jsonb_to_recordset(p_sections) as x(
    course_source_id text, source_id text, title text, position integer,
    summary_text text, visible boolean
  )
  join public.tema_courses course
    on course.owner_id = p_owner_id and course.source_id = x.course_source_id
  on conflict (owner_id, course_id, source_id) do update set
    title = excluded.title,
    position = excluded.position,
    summary_text = excluded.summary_text,
    visible = excluded.visible,
    captured_at = excluded.captured_at,
    updated_at = excluded.updated_at,
    catalog_visible = true;
  get diagnostics v_rows = row_count;
  if v_rows <> jsonb_array_length(p_sections) then
    raise exception 'TEMA section publish count mismatch';
  end if;

  insert into public.tema_activities (
    owner_id, course_id, section_id, source_id, name, module_type,
    official_url, description_text, visible, availability_text,
    candidate_names, opens_at, due_at, completion_state, captured_at,
    updated_at, catalog_visible
  )
  select
    p_owner_id, course.id, section.id, x.source_id, x.name, x.module_type,
    x.official_url, x.description_text, x.visible,
    coalesce(x.availability_text, '{}'), coalesce(x.candidate_names, '{}'),
    x.opens_at, x.due_at, x.completion_state, p_captured_at,
    p_captured_at, true
  from jsonb_to_recordset(p_activities) as x(
    course_source_id text, section_source_id text, source_id text,
    name text, module_type text, official_url text, description_text text,
    visible boolean, availability_text text[], candidate_names text[],
    opens_at timestamptz, due_at timestamptz, completion_state text
  )
  join public.tema_courses course
    on course.owner_id = p_owner_id and course.source_id = x.course_source_id
  join public.tema_sections section
    on section.owner_id = p_owner_id and section.course_id = course.id
      and section.source_id = x.section_source_id
  on conflict (owner_id, section_id, source_id) do update set
    course_id = excluded.course_id,
    name = excluded.name,
    module_type = excluded.module_type,
    official_url = excluded.official_url,
    description_text = excluded.description_text,
    visible = excluded.visible,
    availability_text = excluded.availability_text,
    candidate_names = excluded.candidate_names,
    opens_at = excluded.opens_at,
    due_at = excluded.due_at,
    completion_state = excluded.completion_state,
    captured_at = excluded.captured_at,
    updated_at = excluded.updated_at,
    catalog_visible = true;
  get diagnostics v_rows = row_count;
  if v_rows <> jsonb_array_length(p_activities) then
    raise exception 'TEMA activity publish count mismatch';
  end if;

  insert into public.tema_grade_items (
    owner_id, course_id, source_id, item_name, item_type, module_type,
    grade_display, grade_raw, grade_min, grade_max, feedback_text,
    graded_at, official_url, captured_at, updated_at, catalog_visible
  )
  select
    p_owner_id, course.id, x.source_id, x.item_name, x.item_type,
    x.module_type, x.grade_display, x.grade_raw, x.grade_min, x.grade_max,
    x.feedback_text, x.graded_at, x.official_url, p_captured_at,
    p_captured_at, true
  from jsonb_to_recordset(p_grades) as x(
    course_source_id text, source_id text, item_name text, item_type text,
    module_type text, grade_display text, grade_raw numeric,
    grade_min numeric, grade_max numeric, feedback_text text,
    graded_at timestamptz, official_url text
  )
  join public.tema_courses course
    on course.owner_id = p_owner_id and course.source_id = x.course_source_id
  on conflict (owner_id, course_id, source_id) do update set
    item_name = excluded.item_name,
    item_type = excluded.item_type,
    module_type = excluded.module_type,
    grade_display = excluded.grade_display,
    grade_raw = excluded.grade_raw,
    grade_min = excluded.grade_min,
    grade_max = excluded.grade_max,
    feedback_text = excluded.feedback_text,
    graded_at = excluded.graded_at,
    official_url = excluded.official_url,
    captured_at = excluded.captured_at,
    updated_at = excluded.updated_at,
    catalog_visible = true;
  get diagnostics v_rows = row_count;
  if v_rows <> jsonb_array_length(p_grades) then
    raise exception 'TEMA grade publish count mismatch';
  end if;

  insert into public.tema_announcements (
    owner_id, course_id, source_id, title, excerpt, author_name, posted_at,
    official_url, captured_at, updated_at, catalog_visible
  )
  select
    p_owner_id, course.id, x.source_id, x.title, x.excerpt,
    x.author_name, x.posted_at, x.official_url, p_captured_at,
    p_captured_at, true
  from jsonb_to_recordset(p_announcements) as x(
    course_source_id text, source_id text, title text, excerpt text,
    author_name text, posted_at timestamptz, official_url text
  )
  join public.tema_courses course
    on course.owner_id = p_owner_id and course.source_id = x.course_source_id
  on conflict (owner_id, course_id, source_id) do update set
    title = excluded.title,
    excerpt = excluded.excerpt,
    author_name = excluded.author_name,
    posted_at = excluded.posted_at,
    official_url = excluded.official_url,
    captured_at = excluded.captured_at,
    updated_at = excluded.updated_at,
    catalog_visible = true;
  get diagnostics v_rows = row_count;
  if v_rows <> jsonb_array_length(p_announcements) then
    raise exception 'TEMA announcement publish count mismatch';
  end if;

  insert into public.tema_files (
    owner_id, candidate_id, course_id, section_id, activity_id,
    activity_name, file_name, file_type, content_type, size_bytes, sha256,
    storage_bucket, storage_object_name, source_url, captured_at, updated_at,
    catalog_visible
  )
  select
    p_owner_id, x.candidate_id, course.id, section.id, activity.id,
    x.activity_name, x.file_name, x.file_type, x.content_type,
    x.size_bytes, x.sha256, x.storage_bucket, x.storage_object_name,
    x.source_url, p_captured_at, p_captured_at, true
  from jsonb_to_recordset(p_files) as x(
    candidate_id text, course_source_id text, section_source_id text,
    activity_source_id text, activity_name text, file_name text,
    file_type text, content_type text, size_bytes bigint, sha256 text,
    storage_bucket text, storage_object_name text, source_url text
  )
  join public.tema_courses course
    on course.owner_id = p_owner_id and course.source_id = x.course_source_id
  join public.tema_sections section
    on section.owner_id = p_owner_id and section.course_id = course.id
      and section.source_id = x.section_source_id
  left join public.tema_activities activity
    on activity.owner_id = p_owner_id and activity.course_id = course.id
      and activity.section_id = section.id
      and activity.source_id = x.activity_source_id
  where x.activity_source_id is null or activity.id is not null
  on conflict (owner_id, candidate_id) do update set
    course_id = excluded.course_id,
    section_id = excluded.section_id,
    activity_id = excluded.activity_id,
    activity_name = excluded.activity_name,
    file_name = excluded.file_name,
    file_type = excluded.file_type,
    content_type = excluded.content_type,
    size_bytes = excluded.size_bytes,
    sha256 = excluded.sha256,
    storage_bucket = excluded.storage_bucket,
    storage_object_name = excluded.storage_object_name,
    source_url = excluded.source_url,
    captured_at = excluded.captured_at,
    updated_at = excluded.updated_at,
    catalog_visible = true;
  get diagnostics v_rows = row_count;
  if v_rows <> jsonb_array_length(p_files) then
    raise exception 'TEMA file publish count mismatch';
  end if;

  if (p_complete_scopes->>'files')::boolean then
  update public.tema_files file set
    catalog_visible = false,
    updated_at = p_captured_at
  where file.owner_id = p_owner_id and file.catalog_visible
    and not exists (
      select 1 from jsonb_to_recordset(p_files) as x(candidate_id text)
      where x.candidate_id = file.candidate_id
    );
  end if;

  if (p_complete_scopes->>'grades')::boolean then
  update public.tema_grade_items grade set
    catalog_visible = false,
    updated_at = p_captured_at
  where grade.owner_id = p_owner_id and grade.catalog_visible
    and not exists (
      select 1
      from jsonb_to_recordset(p_grades) as x(course_source_id text, source_id text)
      join public.tema_courses course
        on course.owner_id = p_owner_id and course.source_id = x.course_source_id
      where course.id = grade.course_id and x.source_id = grade.source_id
    );
  end if;

  if (p_complete_scopes->>'announcements')::boolean then
  update public.tema_announcements announcement set
    catalog_visible = false,
    updated_at = p_captured_at
  where announcement.owner_id = p_owner_id and announcement.catalog_visible
    and not exists (
      select 1
      from jsonb_to_recordset(p_announcements) as x(course_source_id text, source_id text)
      join public.tema_courses course
        on course.owner_id = p_owner_id and course.source_id = x.course_source_id
      where course.id = announcement.course_id and x.source_id = announcement.source_id
    );
  end if;

  if (p_complete_scopes->>'activities')::boolean then
  update public.tema_activities activity set
    catalog_visible = false,
    updated_at = p_captured_at
  where activity.owner_id = p_owner_id and activity.catalog_visible
    and not exists (
      select 1
      from jsonb_to_recordset(p_activities) as x(
        course_source_id text, section_source_id text, source_id text
      )
      join public.tema_courses course
        on course.owner_id = p_owner_id and course.source_id = x.course_source_id
      join public.tema_sections section
        on section.owner_id = p_owner_id and section.course_id = course.id
          and section.source_id = x.section_source_id
      where section.id = activity.section_id and x.source_id = activity.source_id
    );
  end if;

  if (p_complete_scopes->>'sections')::boolean then
  update public.tema_sections section set
    catalog_visible = false,
    updated_at = p_captured_at
  where section.owner_id = p_owner_id and section.catalog_visible
    and not exists (
      select 1
      from jsonb_to_recordset(p_sections) as x(
        course_source_id text, source_id text
      )
      join public.tema_courses course
        on course.owner_id = p_owner_id and course.source_id = x.course_source_id
      where course.id = section.course_id and x.source_id = section.source_id
    );
  end if;

  if (p_complete_scopes->>'courses')::boolean then
  update public.tema_courses course set
    catalog_visible = false,
    updated_at = p_captured_at
  where course.owner_id = p_owner_id and course.catalog_visible
    and not exists (
      select 1 from jsonb_to_recordset(p_courses) as x(source_id text)
      where x.source_id = course.source_id
    );
  end if;

  -- A child can never remain in the live catalog after its authoritative
  -- parent disappeared. Optional-domain failures still preserve rows for
  -- courses/sections that remain live, but do not create orphaned ghosts.
  update public.tema_sections section set
    catalog_visible = false,
    updated_at = p_captured_at
  where section.owner_id = p_owner_id and section.catalog_visible
    and exists (
      select 1 from public.tema_courses course
      where course.id = section.course_id and course.owner_id = p_owner_id
        and not course.catalog_visible
    );

  update public.tema_activities activity set
    catalog_visible = false,
    updated_at = p_captured_at
  where activity.owner_id = p_owner_id and activity.catalog_visible
    and (
      exists (
        select 1 from public.tema_courses course
        where course.id = activity.course_id and course.owner_id = p_owner_id
          and not course.catalog_visible
      )
      or exists (
        select 1 from public.tema_sections section
        where section.id = activity.section_id and section.owner_id = p_owner_id
          and not section.catalog_visible
      )
    );

  update public.tema_files file set
    catalog_visible = false,
    updated_at = p_captured_at
  where file.owner_id = p_owner_id and file.catalog_visible
    and (
      exists (
        select 1 from public.tema_courses course
        where course.id = file.course_id and course.owner_id = p_owner_id
          and not course.catalog_visible
      )
      or exists (
        select 1 from public.tema_sections section
        where section.id = file.section_id and section.owner_id = p_owner_id
          and not section.catalog_visible
      )
      or (
        file.activity_id is not null and exists (
          select 1 from public.tema_activities activity
          where activity.id = file.activity_id and activity.owner_id = p_owner_id
            and not activity.catalog_visible
        )
      )
    );

  update public.tema_grade_items grade set
    catalog_visible = false,
    updated_at = p_captured_at
  where grade.owner_id = p_owner_id and grade.catalog_visible
    and exists (
      select 1 from public.tema_courses course
      where course.id = grade.course_id and course.owner_id = p_owner_id
        and not course.catalog_visible
    );

  update public.tema_announcements announcement set
    catalog_visible = false,
    updated_at = p_captured_at
  where announcement.owner_id = p_owner_id and announcement.catalog_visible
    and exists (
      select 1 from public.tema_courses course
      where course.id = announcement.course_id and course.owner_id = p_owner_id
        and not course.catalog_visible
    );

  update public.tema_sync_runs set
    status = p_status,
    finished_at = now(),
    captured_at = p_captured_at,
    course_count = jsonb_array_length(p_courses),
    activity_count = jsonb_array_length(p_activities),
    file_count = jsonb_array_length(p_files),
    warnings = array(select jsonb_array_elements_text(p_warnings)),
    error_message = null
  where id = p_run_id and owner_id = p_owner_id and status = 'running';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'TEMA run finalization count mismatch';
  end if;

  update public.tema_connections set
    moodle_user_id = p_moodle_user_id,
    last_synced_at = now(),
    last_error = null,
    updated_at = now()
  where owner_id = p_owner_id
    and status = 'connected'
    and token_fingerprint = p_token_fingerprint;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'TEMA connection finalization count mismatch';
  end if;

  return jsonb_build_object(
    'courses', jsonb_array_length(p_courses),
    'sections', jsonb_array_length(p_sections),
    'activities', jsonb_array_length(p_activities),
    'files', jsonb_array_length(p_files),
    'grades', jsonb_array_length(p_grades),
    'announcements', jsonb_array_length(p_announcements)
  );
end;
$function$;

revoke all on function public.publish_tema_snapshot(
  uuid, text, uuid, bigint, timestamptz, text, jsonb, jsonb, jsonb, jsonb,
  jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.publish_tema_snapshot(
  uuid, text, uuid, bigint, timestamptz, text, jsonb, jsonb, jsonb, jsonb,
  jsonb, jsonb, jsonb, jsonb
) to service_role;
