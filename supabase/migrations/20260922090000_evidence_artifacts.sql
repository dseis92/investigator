-- Matter-scoped evidence artifact storage.
-- Files are private in Supabase Storage. The database row keeps the file's
-- relationship to the evidence ledger, while signed URLs are created only
-- after the caller passes the existing matter-membership policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'matter-artifacts',
  'matter-artifacts',
  false,
  52428800,
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

create policy "matter_artifacts_read_members"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'matter-artifacts'
    and public.is_matter_member((storage.foldername(name))[1]::uuid)
  );

create policy "matter_artifacts_insert_roles"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'matter-artifacts'
    and public.has_matter_role(
      (storage.foldername(name))[1]::uuid,
      array['attorney', 'admin', 'investigator', 'paralegal']
    )
  );

create policy "matter_artifacts_delete_roles"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'matter-artifacts'
    and public.has_matter_role(
      (storage.foldername(name))[1]::uuid,
      array['attorney', 'admin', 'investigator', 'paralegal']
    )
  );

create table public.evidence_artifacts (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  evidence_id uuid not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  sha256_hash text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (matter_id, id),
  foreign key (matter_id, evidence_id)
    references public.evidence(matter_id, id) on delete cascade
);

create index evidence_artifacts_evidence_idx
  on public.evidence_artifacts(matter_id, evidence_id, created_at desc);

alter table public.evidence_artifacts enable row level security;

create policy "evidence_artifacts_select_members"
  on public.evidence_artifacts for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "evidence_artifacts_insert_roles"
  on public.evidence_artifacts for insert to authenticated
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "evidence_artifacts_delete_roles"
  on public.evidence_artifacts for delete to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
