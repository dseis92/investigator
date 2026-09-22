-- MatterPilot Phase 3: verified client portal grants.
-- A portal grant is matter-scoped and matched to the authenticated client's
-- verified Supabase email. Clients never receive direct access to staff tables;
-- the read RPC returns only explicitly client-visible material.

create table public.client_portal_grants (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  client_email text not null,
  client_name text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_accessed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (matter_id, client_email),
  constraint client_portal_grants_email_normalized_check
    check (client_email = lower(trim(client_email)))
);

create index client_portal_grants_email_idx
  on public.client_portal_grants(lower(client_email), status);

alter table public.client_portal_grants enable row level security;

create policy "client_portal_grants_select_members"
  on public.client_portal_grants for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "client_portal_grants_insert_roles"
  on public.client_portal_grants for insert to authenticated
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "client_portal_grants_update_roles"
  on public.client_portal_grants for update to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create or replace function public.normalize_client_portal_grant_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.client_email := lower(trim(new.client_email));
  if new.status = 'active' then
    new.revoked_at := null;
  elsif new.revoked_at is null then
    new.revoked_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger client_portal_grants_normalize_email
  before insert or update of client_email, status, revoked_at
  on public.client_portal_grants
  for each row execute function public.normalize_client_portal_grant_email();

create or replace function public.get_client_portal_home()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce((select auth.jwt() ->> 'email'), '')));
  v_result jsonb;
begin
  if auth.uid() is null or v_email = '' then
    return null;
  end if;

  update public.client_portal_grants
  set last_accessed_at = now(), updated_at = now()
  where lower(client_email) = v_email
    and status = 'active';

  select jsonb_build_object(
    'email', v_email,
    'matters', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', matter.id,
        'name', matter.name,
        'matterNumber', matter.matter_number,
        'status', matter.status,
        'appointments', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', appointment.id,
              'title', appointment.title,
              'startsAt', appointment.starts_at,
              'endsAt', appointment.ends_at,
              'location', coalesce(appointment.location, 'Location to be confirmed'),
              'status', appointment.status,
              'documents', coalesce((
                select jsonb_agg(
                  jsonb_build_object(
                    'id', document.id,
                    'name', document.name,
                    'content', draft.content,
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
                    ), '[]'::jsonb)
                  ) order by document.name
                )
                from public.appointment_documents document
                join public.appointment_document_drafts draft
                  on draft.matter_id = document.matter_id
                 and draft.appointment_document_id = document.id
                 and draft.status = 'final'
                 and draft.visibility = 'client'
                where document.matter_id = appointment.matter_id
                  and document.appointment_id = appointment.id
              ), '[]'::jsonb)
            ) order by appointment.starts_at
          )
          from public.appointments appointment
          where appointment.matter_id = matter.id
            and appointment.status <> 'cancelled'
            and (
              lower(coalesce(appointment.client_email, '')) = v_email
              or exists (
                select 1
                from public.appointment_participants participant
                where participant.matter_id = appointment.matter_id
                  and participant.appointment_id = appointment.id
                  and lower(coalesce(participant.email, '')) = v_email
              )
            )
        ), '[]'::jsonb)
      ) order by matter.name
    ), '[]'::jsonb)
  )
  into v_result
  from public.matters matter
  where exists (
    select 1
    from public.client_portal_grants grant_row
    where grant_row.matter_id = matter.id
      and lower(grant_row.client_email) = v_email
      and grant_row.status = 'active'
  );

  return v_result;
end;
$$;

revoke all on function public.normalize_client_portal_grant_email() from public;
revoke all on function public.get_client_portal_home() from public, anon;
grant execute on function public.get_client_portal_home() to authenticated;
