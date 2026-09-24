-- MatterPilot Phase 3: secure client document requests and uploads.
-- Client files live in a separate private bucket and are only reachable by
-- an active portal grant for the matter or by a matter member.

create or replace function public.client_portal_has_access(p_matter_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce((select auth.jwt() ->> 'email'), '')));
begin
  return auth.uid() is not null
    and v_email <> ''
    and exists (
      select 1
      from public.client_portal_grants grant_row
      where grant_row.matter_id = p_matter_id
        and lower(grant_row.client_email) = v_email
        and grant_row.status = 'active'
    );
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-portal-documents',
  'client-portal-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.client_portal_document_requests (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 180),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'requested' check (status in ('requested', 'uploaded', 'approved', 'rejected')),
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or (size_bytes > 0 and size_bytes <= 26214400)),
  uploaded_by_email text,
  uploaded_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  reviewer_note text,
  requested_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  foreign key (matter_id, appointment_id)
    references public.appointments(matter_id, id) on delete set null,
  constraint client_portal_document_requests_file_check check (
    (status = 'requested' and storage_path is null and file_name is null and uploaded_at is null)
    or
    (status in ('uploaded', 'approved', 'rejected') and storage_path is not null and file_name is not null and mime_type is not null and size_bytes is not null and uploaded_at is not null)
  )
);

create index client_portal_document_requests_matter_idx
  on public.client_portal_document_requests(matter_id, status, created_at desc);

alter table public.client_portal_document_requests enable row level security;

create policy "client_portal_document_requests_select_members_or_clients"
  on public.client_portal_document_requests for select to authenticated
  using (public.is_matter_member(matter_id) or public.client_portal_has_access(matter_id));

create policy "client_portal_document_requests_insert_members"
  on public.client_portal_document_requests for insert to authenticated
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "client_portal_document_requests_update_members"
  on public.client_portal_document_requests for update to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "client_portal_documents_read_members_or_clients"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'client-portal-documents'
    and (
      public.is_matter_member((storage.foldername(name))[1]::uuid)
      or public.client_portal_has_access((storage.foldername(name))[1]::uuid)
    )
  );

create policy "client_portal_documents_insert_active_clients"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-portal-documents'
    and public.client_portal_has_access((storage.foldername(name))[1]::uuid)
    and exists (
      select 1
      from public.client_portal_document_requests request_row
      where request_row.matter_id = (storage.foldername(name))[1]::uuid
        and request_row.id = (storage.foldername(name))[2]::uuid
        and request_row.status in ('requested', 'rejected')
    )
  );

create or replace function public.get_client_portal_documents(p_matter_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.client_portal_has_access(p_matter_id) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', request_row.id,
      'appointmentId', request_row.appointment_id,
      'title', request_row.title,
      'description', request_row.description,
      'status', request_row.status,
      'fileName', request_row.file_name,
      'mimeType', request_row.mime_type,
      'sizeBytes', request_row.size_bytes,
      'uploadedAt', request_row.uploaded_at,
      'reviewerNote', request_row.reviewer_note,
      'createdAt', request_row.created_at
    ) order by request_row.created_at desc)
    from public.client_portal_document_requests request_row
    where request_row.matter_id = p_matter_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.complete_client_portal_document_upload(
  p_request_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce((select auth.jwt() ->> 'email'), '')));
  v_request public.client_portal_document_requests%rowtype;
begin
  select * into v_request
  from public.client_portal_document_requests
  where id = p_request_id
  for update;

  if v_request.id is null or not public.client_portal_has_access(v_request.matter_id) then
    raise exception 'Document request is not available.';
  end if;
  if v_request.status not in ('requested', 'rejected') then
    raise exception 'This document request has already been uploaded.';
  end if;
  if p_storage_path <> v_request.matter_id::text || '/' || v_request.id::text || '/' || split_part(p_storage_path, '/', 3) then
    raise exception 'Invalid document storage path.';
  end if;
  if p_file_name is null or char_length(trim(p_file_name)) < 1 or p_size_bytes <= 0 or p_size_bytes > 26214400 then
    raise exception 'Invalid document metadata.';
  end if;

  update public.client_portal_document_requests
  set status = 'uploaded',
      storage_path = p_storage_path,
      file_name = p_file_name,
      mime_type = p_mime_type,
      size_bytes = p_size_bytes,
      uploaded_by_email = v_email,
      uploaded_at = now(),
      reviewer_note = null,
      updated_at = now()
  where id = v_request.id;

  insert into public.client_portal_activity(matter_id, activity_type, actor_role, summary)
  values (v_request.matter_id, 'document_submitted', 'client', 'Client uploaded ' || p_file_name);

  return v_request.id;
end;
$$;

revoke all on function public.client_portal_has_access(uuid) from public, anon;
revoke all on function public.get_client_portal_documents(uuid) from public, anon;
revoke all on function public.complete_client_portal_document_upload(uuid, text, text, text, bigint) from public, anon;
grant execute on function public.client_portal_has_access(uuid) to authenticated;
grant execute on function public.get_client_portal_documents(uuid) to authenticated;
grant execute on function public.complete_client_portal_document_upload(uuid, text, text, text, bigint) to authenticated;
