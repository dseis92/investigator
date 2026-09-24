-- MatterPilot: verified client portal messages and access activity.

create table public.client_portal_messages (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  sender_role text not null check (sender_role in ('client', 'firm')),
  sender_email text not null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (matter_id, id)
);

create table public.client_portal_activity (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  activity_type text not null check (activity_type in ('portal_opened', 'message_sent', 'document_viewed', 'document_submitted')),
  actor_role text not null check (actor_role in ('client', 'firm')),
  summary text not null,
  created_at timestamptz not null default now(),
  unique (matter_id, id)
);

create index client_portal_messages_matter_idx on public.client_portal_messages(matter_id, created_at);
create index client_portal_activity_matter_idx on public.client_portal_activity(matter_id, created_at desc);

alter table public.client_portal_messages enable row level security;
alter table public.client_portal_activity enable row level security;

create policy "client_portal_messages_select_members"
  on public.client_portal_messages for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "client_portal_messages_insert_roles"
  on public.client_portal_messages for insert to authenticated
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "client_portal_activity_select_members"
  on public.client_portal_activity for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "client_portal_activity_insert_roles"
  on public.client_portal_activity for insert to authenticated
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create or replace function public.get_client_portal_messages(p_matter_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce((select auth.jwt() ->> 'email'), '')));
begin
  if auth.uid() is null or v_email = '' or not exists (
    select 1 from public.client_portal_grants grant_row
    where grant_row.matter_id = p_matter_id
      and lower(grant_row.client_email) = v_email
      and grant_row.status = 'active'
  ) then
    return null;
  end if;

  return jsonb_build_object(
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', message.id, 'senderRole', message.sender_role, 'senderEmail', message.sender_email, 'body', message.body, 'createdAt', message.created_at) order by message.created_at) from public.client_portal_messages message where message.matter_id = p_matter_id), '[]'::jsonb),
    'activity', coalesce((select jsonb_agg(jsonb_build_object('id', activity.id, 'type', activity.activity_type, 'actorRole', activity.actor_role, 'summary', activity.summary, 'createdAt', activity.created_at) order by activity.created_at desc) from (select activity.id, activity.activity_type, activity.actor_role, activity.summary, activity.created_at from public.client_portal_activity activity where activity.matter_id = p_matter_id order by activity.created_at desc limit 20) activity), '[]'::jsonb)
  );
end;
$$;

create or replace function public.send_client_portal_message(p_matter_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce((select auth.jwt() ->> 'email'), '')));
  v_message_id uuid;
begin
  if auth.uid() is null or v_email = '' or length(trim(p_body)) < 1 or length(trim(p_body)) > 4000 then
    raise exception 'A valid message is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.client_portal_grants grant_row where grant_row.matter_id = p_matter_id and lower(grant_row.client_email) = v_email and grant_row.status = 'active') then
    raise exception 'Portal access is not active' using errcode = '42501';
  end if;

  insert into public.client_portal_messages(matter_id, sender_role, sender_email, body)
  values (p_matter_id, 'client', v_email, trim(p_body))
  returning id into v_message_id;

  insert into public.client_portal_activity(matter_id, activity_type, actor_role, summary)
  values (p_matter_id, 'message_sent', 'client', 'Client sent a portal message');
  return v_message_id;
end;
$$;

revoke all on function public.get_client_portal_messages(uuid) from public, anon;
revoke all on function public.send_client_portal_message(uuid, text) from public, anon;
grant execute on function public.get_client_portal_messages(uuid) to authenticated;
grant execute on function public.send_client_portal_message(uuid, text) to authenticated;
