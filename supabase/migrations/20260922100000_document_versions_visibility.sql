-- MatterPilot Phase 2: immutable preparation-document versions and explicit sharing state.

alter table public.appointment_document_drafts
  add column if not exists visibility text not null default 'internal';

alter table public.appointment_document_drafts
  drop constraint if exists appointment_document_drafts_visibility_check;

alter table public.appointment_document_drafts
  add constraint appointment_document_drafts_visibility_check
  check (visibility in ('internal', 'client'));

-- Preserve the behavior of previously approved packet documents while making
-- all newly created drafts internal until an attorney explicitly approves them.
update public.appointment_document_drafts
set visibility = 'client'
where status = 'final';

create table public.appointment_document_versions (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_document_id uuid not null,
  version_number integer not null check (version_number > 0),
  content text not null,
  status text not null check (status in ('draft', 'final')),
  visibility text not null check (visibility in ('internal', 'client')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (matter_id, appointment_document_id, version_number),
  foreign key (matter_id, appointment_document_id)
    references public.appointment_documents(matter_id, id) on delete cascade
);

create index appointment_document_versions_document_idx
  on public.appointment_document_versions(matter_id, appointment_document_id, version_number desc);

alter table public.appointment_document_versions enable row level security;

create policy "appointment_document_versions_select_members"
  on public.appointment_document_versions for select to authenticated
  using (public.is_matter_member(matter_id));

revoke insert, update, delete on public.appointment_document_versions from anon, authenticated;

create or replace function public.snapshot_appointment_document_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
begin
  select coalesce(max(version_number), 0) + 1
    into v_version
    from public.appointment_document_versions
   where matter_id = new.matter_id
     and appointment_document_id = new.appointment_document_id;

  insert into public.appointment_document_versions (
    matter_id, appointment_document_id, version_number, content, status, visibility, created_by
  ) values (
    new.matter_id, new.appointment_document_id, v_version, new.content, new.status, new.visibility, new.updated_by
  );

  return new;
end;
$$;

drop trigger if exists appointment_document_draft_version_snapshot on public.appointment_document_drafts;

create trigger appointment_document_draft_version_snapshot
after insert or update of content, status, visibility
on public.appointment_document_drafts
for each row
execute function public.snapshot_appointment_document_draft();

-- A packet is client-facing only when both decisions are true.
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
       and draft.visibility = 'client'
      where d.matter_id = v_packet.matter_id
        and d.appointment_id = v_packet.appointment_id
        and d.name in ('Intake questionnaire', 'Engagement letter')
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.snapshot_appointment_document_draft() from public;
revoke all on function public.get_appointment_packet(text) from public;
grant execute on function public.get_appointment_packet(text) to anon, authenticated;
