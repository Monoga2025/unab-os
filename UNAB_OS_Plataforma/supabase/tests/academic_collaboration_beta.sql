begin;

select plan(16);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user11@example.edu', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user12@example.edu', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user13@example.edu', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.subjects (id, display_name, normalized_key)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cálculo I', public.normalize_academic_catalog_key('Cálculo I'));
insert into public.professors (id, display_name, normalized_key)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ana Gómez', public.normalize_academic_catalog_key('Ana Gómez'));
insert into public.class_sections (id, subject_id, professor_id, term, created_by)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-2', '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2027-1', '11111111-1111-1111-1111-111111111111');
insert into public.section_memberships (section_id, user_id, created_by)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333');
insert into public.academic_items (id, section_id, item_type, title, body, importance, starts_at, created_by, updated_by)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'event', 'Parcial', 'Traer calculadora', 'high', now() + interval '2 days', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111');

select throws_ok($$ insert into public.subjects(display_name, normalized_key) values ('calculo-i','calculo i') $$, '23505', null, 'duplicate rejected');
select throws_ok($$ insert into public.professors(display_name, normalized_key) values ('ana-gomez','ana gomez') $$, '23505', null, 'normalized professor duplicate rejected');
select throws_ok($$ insert into public.class_sections(subject_id, professor_id, term, created_by) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-2', '11111111-1111-1111-1111-111111111111') $$, '23505', null, 'active section tuple is unique');

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('role', 'authenticated', true);
set local role authenticated;

select ok(
  public.normalize_academic_catalog_key(' Cálculo I! ') = 'calculo i'
  and public.create_or_get_subject('Cálculo I!') = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and public.create_or_get_professor('Ana Gómez!') = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  and public.create_or_get_class_section('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-2') = 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'normalization is trim-safe and catalog and section RPCs are idempotent'
);
select is((select count(*) from public.section_memberships where user_id = '33333333-3333-3333-3333-333333333333'), 0::bigint, 'membership is self-only');
select lives_ok($test$
do $block$
declare
  v_item_id uuid;
begin
  insert into public.academic_items(section_id, item_type, title, body, importance, due_at, created_by, updated_by)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'task', 'Guía', 'Resolver ejercicios', 'normal', now() + interval '3 days', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111')
  returning id into v_item_id;
  perform 1 from public.academic_items where id = v_item_id;
  if not found then raise exception 'member cannot select inserted item'; end if;
  update public.academic_items
    set title = 'Guía actualizada', updated_by = '11111111-1111-1111-1111-111111111111'
    where id = v_item_id;
  if not found then raise exception 'member cannot update inserted item'; end if;
  delete from public.academic_items where id = v_item_id;
  if not found then raise exception 'member cannot delete inserted item'; end if;
  if not exists (
    select 1 from public.academic_item_revisions
    where academic_item_id = v_item_id and action = 'delete'
      and before_snapshot is not null and actor_id = '11111111-1111-1111-1111-111111111111'
  ) then raise exception 'hard-delete revision was not retained'; end if;
end;
$block$;
$test$, 'member can directly select, insert, update, and delete with durable audit');

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('role', 'authenticated', true);
set local role authenticated;

select is((select count(*) from public.academic_items), 0::bigint, 'nonmember cannot directly select section items');
select throws_ok($$ insert into public.academic_items(section_id, item_type, title, body, importance, due_at, created_by, updated_by) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'task', 'Intrusión', 'No permitida', 'normal', now() + interval '3 days', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222') $$, '42501', null, 'nonmember cannot directly insert a section item');
select is((with denied as (update public.academic_items set title = 'Intrusión' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' returning 1) select count(*) from denied), 0::bigint, 'nonmember cannot directly update a section item');
select is((with denied as (delete from public.academic_items where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' returning 1) select count(*) from denied), 0::bigint, 'nonmember cannot directly delete a section item');

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('role', 'authenticated', true);
set local role authenticated;

select throws_ok($$ update public.academic_item_revisions set action='update' $$, '42501', null, 'revisions append-only');
select throws_ok($$ update public.academic_items set created_by = '22222222-2222-2222-2222-222222222222' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$, 'P0001', 'academic item creator is immutable', 'item creator is immutable');
select throws_ok($$ update public.academic_items set section_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$, 'P0001', 'academic item section is immutable', 'item section is immutable');
select lives_ok($test$
do $block$
begin
  begin
    update public.academic_items
      set deleted_at = now(), deleted_by = '22222222-2222-2222-2222-222222222222', updated_by = '11111111-1111-1111-1111-111111111111'
      where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    raise exception 'direct soft delete was permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.academic_item_revisions;
    raise exception 'revision delete was permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.academic_items(section_id, item_type, title, body, importance, due_at, created_by, updated_by, deleted_at, deleted_by)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'task', 'Predeleted', 'Forbidden', 'normal', now() + interval '3 days', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', now(), '22222222-2222-2222-2222-222222222222');
    raise exception 'pre-deleted insert was permitted';
  exception when insufficient_privilege then null;
  end;
end;
$block$;
$test$, 'deletion fields are server-owned and revisions cannot be deleted');
select lives_ok($test$
do $block$
begin
  perform public.soft_delete_academic_item('dddddddd-dddd-dddd-dddd-dddddddddddd', 1);
  if exists (select 1 from public.academic_items where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd') then
    raise exception 'soft-deleted item is visible';
  end if;
  if not exists (
    select 1 from public.academic_item_revisions
    where academic_item_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
      and section_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
      and version = 2 and action = 'soft_delete'
      and before_snapshot is not null and after_snapshot is not null
      and actor_id = '11111111-1111-1111-1111-111111111111'
  ) then raise exception 'soft-delete revision is incomplete'; end if;
  perform public.restore_academic_item('dddddddd-dddd-dddd-dddd-dddddddddddd', 2);
  if not exists (select 1 from public.academic_items where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd') then
    raise exception 'restored item is hidden';
  end if;
  if not exists (
    select 1 from public.academic_item_revisions
    where academic_item_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
      and version = 3 and action = 'restore'
      and before_snapshot is not null and after_snapshot is not null
      and actor_id = '11111111-1111-1111-1111-111111111111'
  ) then raise exception 'restore revision is incomplete'; end if;
  begin
    perform public.update_academic_item('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Parcial', 'Versión vieja', 'high', now() + interval '2 days', null, 1);
    raise exception 'stale version was permitted';
  exception when sqlstate 'ACV01' then null;
  end;
end;
$block$;
$test$, 'soft delete and restore preserve visibility, audit, actor, and stale conflict behavior');
select ok(not exists (
  select 1 from unnest(array[
    'idx_subjects_created_by', 'idx_professors_created_by',
    'idx_class_sections_subject_id', 'idx_class_sections_professor_id', 'idx_class_sections_created_by',
    'idx_section_memberships_section_id', 'idx_section_memberships_user_id', 'idx_section_memberships_created_by',
    'idx_academic_items_section_id', 'idx_academic_items_created_by', 'idx_academic_items_updated_by', 'idx_academic_items_deleted_by',
    'idx_academic_item_revisions_item_version', 'idx_academic_item_revisions_section_id', 'idx_academic_item_revisions_actor_id'
  ]) as required_index(index_name)
  where to_regclass('public.' || required_index.index_name) is null
), 'all foreign-key and RLS membership lookup indexes exist');

select * from finish();
rollback;
