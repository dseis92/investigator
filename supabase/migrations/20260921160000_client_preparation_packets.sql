-- MatterPilot client preparation packet.
-- A packet uses a high-entropy, expiring, revocable magic link and exposes
-- only attorney-approved client preparation documents.

alter table public.appointment_documents
  drop constraint if exists appointment_documents_status_check;

alter table public.appointment_documents
  add constraint appointment_documents_status_check
  check (status in ('requested', 'received', 'signed', 'waived'));

alter table public.appointment_intake
  add column if not exists phone text,
  add column if not exists goals text,
  add column if not exists deadlines text,
  add column if not exists engagement_acknowledged_at timestamptz,
  add column if not exists client_completed_at timestamptz;

create table public.appointment_packets (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid not null,
  token text not null unique,
  status text not null default 'active' check (status in ('active', 'completed', 'revoked')),
  expires_at timestamptz not null,
  viewed_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (appointment_id),
  foreign key (matter_id, appointment_id) references public.appointments(matter_id, id) on delete cascade
);

create index appointment_packets_matter_idx
  on public.appointment_packets(matter_id, updated_at desc);

alter table public.appointment_packets enable row level security;

create policy "appointment_packets_select_members"
  on public.appointment_packets for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "appointment_packets_write_roles"
  on public.appointment_packets for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create or replace function public.get_appointment_packet(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_packet public.appointment_packets;
  v_result jsonb;
begin
  if length(trim(coalesce(p_token, ''))) < 40 then
    return null;
  end if;

  select * into v_packet
  from public.appointment_packets
  where token = trim(p_token)
    and status = 'active'
    and expires_at > now();

  if v_packet.id is null then
    return null;
  end if;

  update public.appointment_packets
  set viewed_at = coalesce(viewed_at, now()), updated_at = now()
  where id = v_packet.id;

  select jsonb_build_object(
    'packet', jsonb_build_object(
      'id', v_packet.id,
      'expiresAt', v_packet.expires_at,
      'status', v_packet.status
    ),
    'appointment', (
      select jsonb_build_object(
        'title', a.title,
        'startsAt', a.starts_at,
        'endsAt', a.ends_at,
        'location', coalesce(a.location, 'Location to be confirmed'),
        'clientName', coalesce(a.client_name, '')
      )
      from public.appointments a
      where a.id = v_packet.appointment_id
        and a.matter_id = v_packet.matter_id
    ),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', d.name,
        'content', draft.content,
        'status', d.status
      ) order by case when d.name = 'Intake questionnaire' then 1 else 2 end)
      from public.appointment_documents d
      join public.appointment_document_drafts draft
        on draft.appointment_document_id = d.id
       and draft.status = 'final'
      where d.matter_id = v_packet.matter_id
        and d.appointment_id = v_packet.appointment_id
        and d.name in ('Intake questionnaire', 'Engagement letter')
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.submit_appointment_packet(
  p_token text,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_summary text default null,
  p_goals text default null,
  p_deadlines text default null,
  p_engagement_acknowledged boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_packet public.appointment_packets;
  v_now timestamptz := now();
begin
  if length(trim(coalesce(p_token, ''))) < 40
     or length(trim(coalesce(p_full_name, ''))) < 2
     or position('@' in trim(coalesce(p_email, ''))) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Please complete your name and email address.');
  end if;

  if not coalesce(p_engagement_acknowledged, false) then
    return jsonb_build_object('ok', false, 'error', 'Please acknowledge the engagement terms before submitting.');
  end if;

  select * into v_packet
  from public.appointment_packets
  where token = trim(p_token)
    and status = 'active'
    and expires_at > v_now
  for update;

  if v_packet.id is null then
    return jsonb_build_object('ok', false, 'error', 'This preparation link has expired or is no longer active.');
  end if;

  insert into public.appointment_intake (
    matter_id, appointment_id, full_name, email, phone, summary, goals, deadlines,
    engagement_acknowledged_at, client_completed_at, updated_at
  ) values (
    v_packet.matter_id, v_packet.appointment_id, trim(p_full_name), lower(trim(p_email)),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_summary, '')), ''),
    nullif(trim(coalesce(p_goals, '')), ''),
    nullif(trim(coalesce(p_deadlines, '')), ''),
    v_now, v_now, v_now
  )
  on conflict (appointment_id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    summary = excluded.summary,
    goals = excluded.goals,
    deadlines = excluded.deadlines,
    engagement_acknowledged_at = excluded.engagement_acknowledged_at,
    client_completed_at = excluded.client_completed_at,
    updated_at = v_now;

  update public.appointments
  set client_name = trim(p_full_name), client_email = lower(trim(p_email)), updated_at = v_now
  where id = v_packet.appointment_id and matter_id = v_packet.matter_id;

  update public.appointment_documents
  set status = case when name = 'Engagement letter' then 'signed' else 'received' end,
      received_at = v_now
  where appointment_id = v_packet.appointment_id
    and matter_id = v_packet.matter_id
    and name in ('Intake questionnaire', 'Engagement letter');

  update public.appointment_tasks
  set status = 'done', updated_at = v_now
  where appointment_id = v_packet.appointment_id
    and matter_id = v_packet.matter_id
    and label = 'Intake form completed';

  update public.appointment_participants
  set display_name = trim(p_full_name), email = lower(trim(p_email)), response_status = 'confirmed'
  where appointment_id = v_packet.appointment_id
    and matter_id = v_packet.matter_id
    and participant_role = 'client';

  update public.appointment_packets
  set status = 'completed', completed_at = v_now, updated_at = v_now
  where id = v_packet.id;

  return jsonb_build_object('ok', true, 'completedAt', v_now);
end;
$$;

revoke all on function public.get_appointment_packet(text) from public;
grant execute on function public.get_appointment_packet(text) to anon, authenticated;

revoke all on function public.submit_appointment_packet(text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.submit_appointment_packet(text, text, text, text, text, text, text, boolean) to anon, authenticated;
