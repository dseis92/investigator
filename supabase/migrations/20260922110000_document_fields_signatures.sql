-- MatterPilot Phase 2: structured client fields and a reviewable signature attestation.

alter table public.appointment_document_drafts
  add column if not exists field_schema jsonb not null default '[]'::jsonb,
  add column if not exists field_values jsonb not null default '{}'::jsonb;

alter table public.appointment_document_drafts
  drop constraint if exists appointment_document_drafts_field_schema_object_check,
  drop constraint if exists appointment_document_drafts_field_values_object_check;

alter table public.appointment_document_drafts
  add constraint appointment_document_drafts_field_schema_object_check
  check (jsonb_typeof(field_schema) = 'array'),
  add constraint appointment_document_drafts_field_values_object_check
  check (jsonb_typeof(field_values) = 'object');

alter table public.appointment_document_versions
  add column if not exists field_schema jsonb not null default '[]'::jsonb,
  add column if not exists field_values jsonb not null default '{}'::jsonb;

create table public.appointment_document_signatures (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_document_id uuid not null,
  signer_role text not null check (signer_role in ('client', 'attorney')),
  status text not null default 'requested' check (status in ('requested', 'signed', 'declined', 'cancelled')),
  signer_name text,
  signer_email text,
  signature_text text,
  consent_text text,
  requested_at timestamptz not null default now(),
  signed_at timestamptz,
  signed_version_id uuid,
  created_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (matter_id, appointment_document_id, signer_role),
  foreign key (matter_id, appointment_document_id)
    references public.appointment_documents(matter_id, id) on delete cascade,
  foreign key (matter_id, signed_version_id)
    references public.appointment_document_versions(matter_id, id) on delete set null
);

create index appointment_document_signatures_matter_idx
  on public.appointment_document_signatures(matter_id, status, updated_at desc);

alter table public.appointment_document_signatures enable row level security;

create policy "appointment_document_signatures_select_members"
  on public.appointment_document_signatures for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "appointment_document_signatures_write_roles"
  on public.appointment_document_signatures for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

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
    matter_id, appointment_document_id, version_number, content, status, visibility,
    field_schema, field_values, created_by
  ) values (
    new.matter_id, new.appointment_document_id, v_version, new.content, new.status, new.visibility,
    new.field_schema, new.field_values, new.updated_by
  );

  return new;
end;
$$;

drop trigger if exists appointment_document_draft_version_snapshot on public.appointment_document_drafts;

create trigger appointment_document_draft_version_snapshot
after insert or update of content, status, visibility, field_schema, field_values
on public.appointment_document_drafts
for each row
execute function public.snapshot_appointment_document_draft();

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
        'status', d.status,
        'fields', coalesce((
          select jsonb_agg(jsonb_build_object(
            'key', field->>'key',
            'label', field->>'label',
            'type', field->>'type',
            'required', coalesce((field->>'required')::boolean, false),
            'value', coalesce(draft.field_values ->> (field->>'key'), '')
          ) order by fields.ordinality)
          from jsonb_array_elements(draft.field_schema) with ordinality as fields(field, ordinality)
          where coalesce((field->>'clientEditable')::boolean, false)
        ), '[]'::jsonb),
        'signature', (
          select jsonb_build_object(
            'id', signature.id,
            'status', signature.status,
            'required', true,
            'signerName', signature.signer_name
          )
          from public.appointment_document_signatures signature
          where signature.matter_id = d.matter_id
            and signature.appointment_document_id = d.id
            and signature.signer_role = 'client'
            and signature.status in ('requested', 'signed')
          limit 1
        )
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

drop function if exists public.submit_appointment_packet(text, text, text, text, text, text, text, boolean);

create or replace function public.submit_appointment_packet(
  p_token text,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_summary text default null,
  p_goals text default null,
  p_deadlines text default null,
  p_engagement_acknowledged boolean default false,
  p_field_values jsonb default '{}'::jsonb,
  p_signature_name text default null,
  p_signature_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_packet public.appointment_packets;
  v_now timestamptz := now();
  v_signature_required boolean := false;
begin
  if length(trim(coalesce(p_token, ''))) < 40
     or length(trim(coalesce(p_full_name, ''))) < 2
     or position('@' in trim(coalesce(p_email, ''))) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Please complete your name and email address.');
  end if;

  if not coalesce(p_engagement_acknowledged, false) then
    return jsonb_build_object('ok', false, 'error', 'Please acknowledge the engagement terms before submitting.');
  end if;

  if jsonb_typeof(coalesce(p_field_values, '{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'The preparation answers could not be read.');
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

  select exists(
    select 1
    from public.appointment_document_signatures signature
    join public.appointment_document_drafts draft
      on draft.matter_id = signature.matter_id
     and draft.appointment_document_id = signature.appointment_document_id
     and draft.status = 'final'
     and draft.visibility = 'client'
    where signature.matter_id = v_packet.matter_id
      and signature.signer_role = 'client'
      and signature.status = 'requested'
  ) into v_signature_required;

  if v_signature_required and (length(trim(coalesce(p_signature_name, ''))) < 2 or not coalesce(p_signature_consent, false)) then
    return jsonb_build_object('ok', false, 'error', 'Please type your name and confirm the signature attestation before submitting.');
  end if;

  if exists(
    select 1
    from public.appointment_document_drafts draft
    join public.appointment_documents d
      on d.matter_id = draft.matter_id
     and d.id = draft.appointment_document_id
     and d.appointment_id = v_packet.appointment_id
    cross join lateral jsonb_array_elements(draft.field_schema) as field_schema_item(field)
    where draft.matter_id = v_packet.matter_id
      and draft.status = 'final'
      and draft.visibility = 'client'
      and d.name in ('Intake questionnaire', 'Engagement letter')
      and coalesce((field_schema_item.field->>'clientEditable')::boolean, false)
      and coalesce((field_schema_item.field->>'required')::boolean, false)
      and length(trim(coalesce(p_field_values ->> (field_schema_item.field->>'key'), ''))) = 0
  ) then
    return jsonb_build_object('ok', false, 'error', 'Please complete the required document fields before submitting.');
  end if;

  update public.appointment_document_drafts draft
  set field_values = draft.field_values || coalesce((
    select jsonb_object_agg(input.key, input.value)
    from jsonb_each(coalesce(p_field_values, '{}'::jsonb)) input
    where exists (
      select 1
      from jsonb_array_elements(draft.field_schema) as field_schema_item(field)
      where field_schema_item.field->>'key' = input.key
        and coalesce((field_schema_item.field->>'clientEditable')::boolean, false)
    )
  ), '{}'::jsonb)
  where draft.matter_id = v_packet.matter_id
    and draft.status = 'final'
    and draft.visibility = 'client'
    and exists (
      select 1 from public.appointment_documents d
      where d.id = draft.appointment_document_id
        and d.matter_id = v_packet.matter_id
        and d.appointment_id = v_packet.appointment_id
        and d.name in ('Intake questionnaire', 'Engagement letter')
    );

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

  if v_signature_required then
    update public.appointment_document_signatures signature
    set status = 'signed',
        signer_name = trim(p_signature_name),
        signer_email = lower(trim(p_email)),
        signature_text = trim(p_signature_name),
        consent_text = 'Signer typed their name and affirmed the engagement acknowledgment in the secure client packet.',
        signed_at = v_now,
        signed_version_id = (
          select version.id
          from public.appointment_document_versions version
          where version.matter_id = signature.matter_id
            and version.appointment_document_id = signature.appointment_document_id
          order by version.version_number desc
          limit 1
        ),
        updated_at = v_now
    where signature.matter_id = v_packet.matter_id
      and signature.signer_role = 'client'
      and signature.status = 'requested';
  end if;

  update public.appointment_documents
  set status = case when name = 'Engagement letter' and v_signature_required then 'signed' else 'received' end,
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
revoke all on function public.submit_appointment_packet(text, text, text, text, text, text, text, boolean, jsonb, text, boolean) from public;
grant execute on function public.submit_appointment_packet(text, text, text, text, text, text, text, boolean, jsonb, text, boolean) to anon, authenticated;
