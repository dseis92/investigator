-- Evidence artifact lifecycle controls.
-- Originals remain immutable records when a replacement is uploaded. Retention
-- and legal-hold state is managed separately from the file bytes so a reviewer
-- can preserve the chain of custody without deleting the source artifact.

alter table public.evidence_artifacts
  add column lifecycle_status text not null default 'active'
    check (lifecycle_status in ('active', 'superseded', 'released')),
  add column replaces_artifact_id uuid,
  add column retention_until timestamptz,
  add column legal_hold boolean not null default false,
  add column released_at timestamptz;

alter table public.evidence_artifacts
  add constraint evidence_artifacts_replaces_fkey
    foreign key (matter_id, replaces_artifact_id)
    references public.evidence_artifacts(matter_id, id)
    on delete set null;

create index evidence_artifacts_replacement_idx
  on public.evidence_artifacts(matter_id, replaces_artifact_id);

create or replace function public.validate_evidence_artifact_relationship()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  replaced_evidence_id uuid;
begin
  if new.replaces_artifact_id is not null then
    if new.replaces_artifact_id = new.id then
      raise exception 'An evidence artifact cannot replace itself';
    end if;

    select evidence_id into replaced_evidence_id
    from public.evidence_artifacts
    where matter_id = new.matter_id
      and id = new.replaces_artifact_id;

    if replaced_evidence_id is null or replaced_evidence_id <> new.evidence_id then
      raise exception 'Replacement artifacts must belong to the same evidence record';
    end if;
  end if;

  return new;
end;
$$;

create trigger evidence_artifacts_relationship_guard
before insert or update on public.evidence_artifacts
for each row execute function public.validate_evidence_artifact_relationship();

create or replace function public.guard_evidence_artifact_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.lifecycle_status <> 'active' or new.released_at is not null then
    raise exception 'New evidence artifacts must begin in the active lifecycle state';
  end if;
  new.released_at := null;
  return new;
end;
$$;

create trigger evidence_artifacts_insert_guard
before insert on public.evidence_artifacts
for each row execute function public.guard_evidence_artifact_insert();

create or replace function public.guard_evidence_artifact_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.lifecycle_status = 'released' and new.lifecycle_status <> 'released' then
    raise exception 'Released evidence artifacts cannot be reopened';
  end if;

  if new.matter_id <> old.matter_id
    or new.evidence_id <> old.evidence_id
    or new.storage_path <> old.storage_path
    or new.file_name <> old.file_name
    or new.mime_type <> old.mime_type
    or new.size_bytes <> old.size_bytes
    or coalesce(new.sha256_hash, '') <> coalesce(old.sha256_hash, '')
    or new.created_by <> old.created_by
    or new.created_at <> old.created_at
    or new.replaces_artifact_id is distinct from old.replaces_artifact_id then
    raise exception 'Evidence artifact identity and provenance fields are immutable';
  end if;

  if new.lifecycle_status = 'released' then
    if new.legal_hold then
      raise exception 'An evidence artifact under legal hold cannot be released';
    end if;
    if new.retention_until is not null and new.retention_until > now() then
      raise exception 'An evidence artifact cannot be released before its retention date';
    end if;
    new.released_at := coalesce(old.released_at, now());
  else
    new.released_at := null;
  end if;

  return new;
end;
$$;

create trigger evidence_artifacts_update_guard
before update on public.evidence_artifacts
for each row execute function public.guard_evidence_artifact_update();

alter table public.evidence_artifacts enable row level security;

create policy "evidence_artifacts_update_review_roles"
  on public.evidence_artifacts for update to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator']));

alter policy "evidence_artifacts_delete_roles" on public.evidence_artifacts
  using (
    public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator'])
    and lifecycle_status = 'released'
    and not legal_hold
    and (retention_until is null or retention_until <= now())
  );

alter policy "matter_artifacts_delete_roles" on storage.objects
  using (
    bucket_id = 'matter-artifacts'
    and exists (
      select 1
      from public.evidence_artifacts artifact
      where artifact.storage_path = name
        and public.has_matter_role(artifact.matter_id, array['attorney', 'admin', 'investigator'])
        and artifact.lifecycle_status = 'released'
        and not artifact.legal_hold
        and (artifact.retention_until is null or artifact.retention_until <= now())
    )
  );
