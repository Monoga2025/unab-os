-- Secure Telegram <-> Universidad OS account pairing.
-- Pairing codes are never stored in plaintext: the application supplies an
-- HMAC-SHA256 digest and only the trusted bridge service can consume it.

create table public.telegram_links (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  telegram_user_id bigint not null
    constraint telegram_links_user_id_positive_check check (telegram_user_id > 0),
  telegram_chat_id bigint not null
    constraint telegram_links_private_chat_check check (
      telegram_chat_id > 0 and telegram_chat_id = telegram_user_id
    ),
  linked_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unlinked_at timestamptz,
  constraint telegram_links_unlinked_check check (
    unlinked_at is null or unlinked_at >= linked_at
  ),
  constraint telegram_links_target_key unique (
    id, owner_id, telegram_user_id, telegram_chat_id
  )
);

create unique index telegram_links_one_active_per_owner_idx
  on public.telegram_links (owner_id)
  where unlinked_at is null;
create unique index telegram_links_one_active_per_telegram_idx
  on public.telegram_links (telegram_user_id)
  where unlinked_at is null;
create index telegram_links_owner_history_idx
  on public.telegram_links (owner_id);

create table public.telegram_link_codes (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null
    constraint telegram_link_codes_hash_check check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint telegram_link_codes_hash_key unique (code_hash),
  constraint telegram_link_codes_expiry_check check (expires_at > created_at),
  constraint telegram_link_codes_consumed_check check (
    consumed_at is null or consumed_at >= created_at
  )
);

create table public.telegram_link_attempts (
  telegram_user_id bigint primary key
    constraint telegram_link_attempts_user_id_positive_check check (telegram_user_id > 0),
  telegram_chat_id bigint not null
    constraint telegram_link_attempts_private_chat_check check (
      telegram_chat_id > 0 and telegram_chat_id = telegram_user_id
    ),
  attempt_count smallint not null default 0
    constraint telegram_link_attempts_count_check check (attempt_count between 0 and 5),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create unique index telegram_link_codes_one_open_per_owner_idx
  on public.telegram_link_codes (owner_id)
  where consumed_at is null;
create index telegram_link_codes_owner_history_idx
  on public.telegram_link_codes (owner_id);
create index telegram_link_codes_open_expiry_idx
  on public.telegram_link_codes (expires_at)
  where consumed_at is null;
create index telegram_link_attempts_blocked_idx
  on public.telegram_link_attempts (blocked_until)
  where blocked_until is not null;

alter table public.jarvis_study_handoffs
  add column telegram_link_id bigint,
  add column telegram_recipient_user_id bigint,
  add column telegram_recipient_chat_id bigint,
  add constraint jarvis_handoffs_telegram_target_presence_check check (
    (
      telegram_link_id is null
      and telegram_recipient_user_id is null
      and telegram_recipient_chat_id is null
    )
    or (
      telegram_link_id is not null
      and telegram_recipient_user_id is not null
      and telegram_recipient_chat_id is not null
    )
  ),
  add constraint jarvis_handoffs_telegram_target_fkey foreign key (
    telegram_link_id,
    owner_id,
    telegram_recipient_user_id,
    telegram_recipient_chat_id
  ) references public.telegram_links (
    id,
    owner_id,
    telegram_user_id,
    telegram_chat_id
  ) on update restrict on delete restrict;

create index jarvis_handoffs_target_status_created_idx
  on public.jarvis_study_handoffs (
    telegram_recipient_user_id,
    telegram_recipient_chat_id,
    status,
    created_at
  )
  where telegram_link_id is not null;
create index jarvis_handoffs_global_target_queue_idx
  on public.jarvis_study_handoffs (status, created_at)
  where telegram_link_id is not null;
create index jarvis_handoffs_telegram_link_idx
  on public.jarvis_study_handoffs (telegram_link_id);

-- Serialize every explicit handoff enqueue with unlink for the same owner.
-- A policy alone can observe an active link just before unlink commits; this
-- trigger establishes a total order and rechecks the target after the lock.
create or replace function public.lock_and_validate_jarvis_handoff_telegram_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Null targets are reserved for the temporary server-only legacy bridge.
  -- The table presence check rejects partial targets, and authenticated RLS
  -- requires an explicit active link.
  if new.telegram_link_id is null
     or new.telegram_recipient_user_id is null
     or new.telegram_recipient_chat_id is null then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.owner_id::text, 80421)
  );

  if not exists (
    select 1
      from public.telegram_links link
     where link.id = new.telegram_link_id
       and link.owner_id = new.owner_id
       and link.telegram_user_id = new.telegram_recipient_user_id
       and link.telegram_chat_id = new.telegram_recipient_chat_id
       and link.unlinked_at is null
  ) then
    raise foreign_key_violation using message = 'telegram target is not active';
  end if;

  return new;
end;
$$;

create trigger jarvis_handoffs_lock_active_telegram_target
before insert on public.jarvis_study_handoffs
for each row execute function public.lock_and_validate_jarvis_handoff_telegram_target();

revoke execute on function public.lock_and_validate_jarvis_handoff_telegram_target()
  from public, anon, authenticated;

alter table public.telegram_links enable row level security;
alter table public.telegram_link_codes enable row level security;
alter table public.telegram_link_attempts enable row level security;

revoke all on table public.telegram_links from anon, authenticated;
revoke all on table public.telegram_link_codes from anon, authenticated;
revoke all on table public.telegram_link_attempts from anon, authenticated;
grant select on table public.telegram_links to authenticated;
grant select, insert, update, delete on table public.telegram_links to service_role;
grant select, insert, update, delete on table public.telegram_link_codes to service_role;
grant select, insert, update, delete on table public.telegram_link_attempts to service_role;
grant usage, select on sequence public.telegram_links_id_seq to service_role;
grant usage, select on sequence public.telegram_link_codes_id_seq to service_role;

create policy "read own telegram link"
  on public.telegram_links for select to authenticated
  using ((select auth.uid()) = owner_id);

-- Intentionally no client policy exists on telegram_link_codes. The table is
-- owner-scoped for lifecycle/auditing, but even its hashes remain server-only.

drop policy if exists "insert own jarvis handoffs" on public.jarvis_study_handoffs;
create policy "insert own jarvis handoffs"
  on public.jarvis_study_handoffs for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and status = 'queued'
    and exists (
      select 1
      from public.telegram_links link
      where link.id = telegram_link_id
        and link.owner_id = owner_id
        and link.telegram_user_id = telegram_recipient_user_id
        and link.telegram_chat_id = telegram_recipient_chat_id
        and link.owner_id = (select auth.uid())
        and link.unlinked_at is null
    )
  );

create or replace function public.issue_telegram_link_code(
  p_owner_id uuid,
  p_code_hash text,
  p_expires_at timestamptz
)
returns table (code_id bigint, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_code_id bigint;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$'
     or p_expires_at <= v_now + interval '30 seconds'
     or p_expires_at > v_now + interval '15 minutes' then
    raise invalid_parameter_value using message = 'invalid telegram link code';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 80421)
  );

  if exists (
    select 1 from public.telegram_links link
    where link.owner_id = p_owner_id and link.unlinked_at is null
  ) then
    raise unique_violation using message = 'telegram account already linked';
  end if;

  update public.telegram_link_codes
     set consumed_at = v_now
   where owner_id = p_owner_id
     and consumed_at is null;

  insert into public.telegram_link_codes (owner_id, code_hash, expires_at)
  values (p_owner_id, p_code_hash, p_expires_at)
  returning id into v_code_id;

  return query select v_code_id, p_expires_at;
end;
$$;

create or replace function public.consume_telegram_link_code(
  p_code_hash text,
  p_telegram_user_id bigint,
  p_telegram_chat_id bigint
)
returns table (
  link_id bigint,
  owner_id uuid,
  telegram_user_id bigint,
  telegram_chat_id bigint,
  linked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_code_id bigint;
  v_owner_id uuid;
  v_link public.telegram_links%rowtype;
  v_attempt_count smallint;
  v_window_started_at timestamptz;
  v_blocked_until timestamptz;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$'
     or p_telegram_user_id <= 0
     or p_telegram_chat_id <> p_telegram_user_id then
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_telegram_user_id::text, 80422)
  );

  insert into public.telegram_link_attempts (
    telegram_user_id, telegram_chat_id, attempt_count, window_started_at, updated_at
  ) values (
    p_telegram_user_id, p_telegram_chat_id, 0, v_now, v_now
  )
  on conflict on constraint telegram_link_attempts_pkey do nothing;

  select attempt.attempt_count, attempt.window_started_at, attempt.blocked_until
    into v_attempt_count, v_window_started_at, v_blocked_until
    from public.telegram_link_attempts attempt
   where attempt.telegram_user_id = p_telegram_user_id
     and attempt.telegram_chat_id = p_telegram_chat_id
   for update;

  if not found or (v_blocked_until is not null and v_blocked_until > v_now) then
    return;
  end if;

  if v_window_started_at <= v_now - interval '10 minutes' then
    v_attempt_count := 0;
    v_window_started_at := v_now;
  end if;

  if v_attempt_count >= 5 then
    update public.telegram_link_attempts as attempt
       set blocked_until = v_now + interval '15 minutes', updated_at = v_now
     where attempt.telegram_user_id = p_telegram_user_id;
    return;
  end if;

  v_attempt_count := v_attempt_count + 1;
  update public.telegram_link_attempts as attempt
     set attempt_count = v_attempt_count,
         window_started_at = v_window_started_at,
         blocked_until = case when v_attempt_count >= 5 then v_now + interval '15 minutes' else null end,
         updated_at = v_now
   where attempt.telegram_user_id = p_telegram_user_id;

  select code.id, code.owner_id
    into v_code_id, v_owner_id
    from public.telegram_link_codes code
   where code.code_hash = p_code_hash
     and code.consumed_at is null
     and code.expires_at > v_now;

  if not found then
    return;
  end if;

  -- All owner-scoped pairing lifecycle operations use the same ordering:
  -- Telegram advisory lock -> owner advisory lock -> code row lock. This
  -- prevents consume/unlink races without introducing code/owner deadlocks.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text, 80421)
  );

  select code.id, code.owner_id
    into v_code_id, v_owner_id
    from public.telegram_link_codes code
   where code.id = v_code_id
     and code.owner_id = v_owner_id
     and code.code_hash = p_code_hash
     and code.consumed_at is null
     and code.expires_at > v_now
   for update;

  if not found then
    return;
  end if;

  -- A Telegram identity may relink to the same Universidad OS owner, but it
  -- cannot be reassigned to a different tenant after unlinking. This also
  -- keeps Telegram-scoped local reminders/tasks from crossing account owners.
  if exists (
    select 1
      from public.telegram_links link
     where link.telegram_user_id = p_telegram_user_id
       and link.owner_id <> v_owner_id
  ) then
    return;
  end if;

  insert into public.telegram_links (
    owner_id, telegram_user_id, telegram_chat_id, linked_at, last_seen_at
  ) values (
    v_owner_id, p_telegram_user_id, p_telegram_chat_id, v_now, v_now
  )
  on conflict do nothing
  returning * into v_link;

  if not found then
    return;
  end if;

  update public.telegram_link_codes
     set consumed_at = v_now
   where id = v_code_id
     and consumed_at is null;

  if not found then
    raise serialization_failure using message = 'telegram link code was consumed concurrently';
  end if;

  delete from public.telegram_link_attempts as attempt
   where attempt.telegram_user_id = p_telegram_user_id;

  return query select
    v_link.id,
    v_link.owner_id,
    v_link.telegram_user_id,
    v_link.telegram_chat_id,
    v_link.linked_at;
end;
$$;

create or replace function public.unlink_telegram_account(p_owner_id uuid)
returns table (unlinked boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_link_id bigint;
  v_unlinked boolean := false;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 80421)
  );

  select link.id
    into v_link_id
    from public.telegram_links link
   where link.owner_id = p_owner_id
     and link.unlinked_at is null
   for update;

  if found then
    update public.telegram_links
       set unlinked_at = v_now, last_seen_at = v_now
     where id = v_link_id
       and owner_id = p_owner_id
       and unlinked_at is null;
    v_unlinked := found;
  end if;

  update public.telegram_link_codes
     set consumed_at = v_now
   where owner_id = p_owner_id
     and consumed_at is null;

  if v_unlinked then
    update public.jarvis_study_handoffs
       set status = 'failed',
           failure_reason = 'Telegram fue desvinculado antes de completar la entrega.',
           updated_at = v_now
     where owner_id = p_owner_id
       and telegram_link_id = v_link_id
       and status in ('queued', 'processing');
  end if;

  return query select v_unlinked;
end;
$$;

revoke execute on function public.issue_telegram_link_code(uuid, text, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.consume_telegram_link_code(text, bigint, bigint)
  from public, anon, authenticated;
revoke execute on function public.unlink_telegram_account(uuid)
  from public, anon, authenticated;
grant execute on function public.issue_telegram_link_code(uuid, text, timestamptz)
  to service_role;
grant execute on function public.consume_telegram_link_code(text, bigint, bigint)
  to service_role;
grant execute on function public.unlink_telegram_account(uuid)
  to service_role;

comment on table public.telegram_links is
  'Immutable Telegram link history; partial indexes allow one active destination per owner and Telegram user.';
comment on table public.telegram_link_codes is
  'Short-lived one-use Telegram pairing digests; plaintext codes are never stored.';
comment on table public.telegram_link_attempts is
  'Server-only failed pairing attempt window and temporary Telegram rate limit.';
comment on function public.consume_telegram_link_code(text, bigint, bigint) is
  'Atomically binds a valid unconsumed digest to the calling Telegram identity; service role only.';
comment on function public.unlink_telegram_account(uuid) is
  'Atomically revokes the active destination, consumes open codes and fails its pending handoffs; service role only.';
