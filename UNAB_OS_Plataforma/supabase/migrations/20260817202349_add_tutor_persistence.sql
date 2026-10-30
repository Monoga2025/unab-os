-- Private, owner-scoped persistence for personal Codex tutoring conversations.
create table public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_id text references public.objectives(id) on delete set null,
  study_session_id uuid,
  study_document_id uuid,
  title text not null constraint tutor_conversations_title_check check (length(title) between 1 and 160 and title = btrim(title)),
  status text not null default 'active' constraint tutor_conversations_status_check check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_conversations_timestamp_order_check check (updated_at >= created_at),
  constraint tutor_conversations_id_owner_unique unique (id,user_id),
  constraint tutor_conversations_session_owner_fkey foreign key (study_session_id,user_id) references public.study_sessions(id,user_id),
  constraint tutor_conversations_document_owner_fkey foreign key (study_document_id,user_id) references public.study_documents(id,user_id)
);
create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  position integer not null constraint tutor_messages_position_check check (position > 0),
  role text not null constraint tutor_messages_role_check check (role in ('user','assistant')),
  content text not null constraint tutor_messages_content_check check (
    content = btrim(content)
    and ((role='user' and length(content) between 1 and 2000) or (role='assistant' and length(content) between 1 and 12000))
  ),
  response_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_messages_timestamp_order_check check (updated_at >= created_at),
  constraint tutor_messages_response_metadata_check check (
    response_metadata is null or (role='assistant' and jsonb_typeof(response_metadata)='object' and pg_column_size(response_metadata) <= 16384)
  ),
  constraint tutor_messages_conversation_position_unique unique (conversation_id,position),
  constraint tutor_messages_conversation_owner_fkey foreign key (conversation_id,user_id) references public.tutor_conversations(id,user_id) on delete cascade
);
create index tutor_conversations_owner_updated_idx on public.tutor_conversations (user_id,updated_at desc);
create index tutor_messages_owner_conversation_created_idx on public.tutor_messages (user_id,conversation_id,created_at desc);
alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;
create policy "read own tutor conversations" on public.tutor_conversations for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own tutor conversations" on public.tutor_conversations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own tutor conversations" on public.tutor_conversations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own tutor conversations" on public.tutor_conversations for delete to authenticated using ((select auth.uid()) = user_id);
create policy "read own tutor messages" on public.tutor_messages for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own tutor messages" on public.tutor_messages for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own tutor messages" on public.tutor_messages for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own tutor messages" on public.tutor_messages for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.tutor_conversations, public.tutor_messages to authenticated;
revoke all on public.tutor_conversations, public.tutor_messages from public, anon;
create function public.persist_tutor_exchange(
  p_conversation_id uuid,
  p_objective_id text,
  p_study_session_id uuid,
  p_study_document_id uuid,
  p_title text,
  p_user_content text,
  p_assistant_content text,
  p_assistant_metadata jsonb
) returns table (
  conversation_id uuid,
  user_message_id uuid,
  assistant_message_id uuid,
  user_position integer,
  assistant_position integer,
  user_message_created_at timestamptz,
  assistant_message_created_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_conversation public.tutor_conversations%rowtype;
  v_next_position integer;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_objective_id is not null and not exists (select 1 from public.objectives o where o.id=p_objective_id) then
    raise exception 'objective is unavailable' using errcode='23503';
  end if;
  if p_study_session_id is not null and not exists (select 1 from public.study_sessions s where s.id=p_study_session_id and s.user_id=v_user_id) then
    raise exception 'study session is unavailable' using errcode='23503';
  end if;
  if p_study_document_id is not null and not exists (select 1 from public.study_documents d where d.id=p_study_document_id and d.user_id=v_user_id) then
    raise exception 'study document is unavailable' using errcode='23503';
  end if;
  select c.* into v_conversation from public.tutor_conversations c where c.id=p_conversation_id and c.user_id=v_user_id for update;
  if found then
    if v_conversation.objective_id is distinct from p_objective_id or v_conversation.study_session_id is distinct from p_study_session_id or v_conversation.study_document_id is distinct from p_study_document_id then
      raise exception 'conversation context does not match' using errcode='23514';
    end if;
  else
    insert into public.tutor_conversations(id,user_id,objective_id,study_session_id,study_document_id,title)
    values(p_conversation_id,v_user_id,p_objective_id,p_study_session_id,p_study_document_id,p_title)
    returning * into v_conversation;
  end if;
  select coalesce(max(m.position),0)+1 into v_next_position from public.tutor_messages m where m.conversation_id=v_conversation.id and m.user_id=v_user_id;
  insert into public.tutor_messages(user_id,conversation_id,position,role,content,response_metadata)
  values(v_user_id,v_conversation.id,v_next_position,'user',p_user_content,null)
  returning id,created_at into user_message_id,user_message_created_at;
  insert into public.tutor_messages(user_id,conversation_id,position,role,content,response_metadata)
  values(v_user_id,v_conversation.id,v_next_position+1,'assistant',p_assistant_content,p_assistant_metadata)
  returning id,created_at into assistant_message_id,assistant_message_created_at;
  update public.tutor_conversations c set updated_at=greatest(c.updated_at,clock_timestamp()) where c.id=v_conversation.id and c.user_id=v_user_id;
  conversation_id:=v_conversation.id;
  user_position:=v_next_position;
  assistant_position:=v_next_position+1;
  return next;
end;
$$;
revoke execute on function public.persist_tutor_exchange(uuid,text,uuid,uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.persist_tutor_exchange(uuid,text,uuid,uuid,text,text,text,jsonb) to authenticated;;
