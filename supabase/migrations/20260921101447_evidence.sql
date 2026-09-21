-- Evidence Ledger. authentication_status is intentionally a separate field
-- from provenance_status: saving an artifact or recording a hash does not by
-- itself establish courtroom authentication or chain of custody, and the UI
-- must be able to say so even when provenance is otherwise well-documented.
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  evidence_number text not null,
  title text not null,
  artifact_type text not null check (artifact_type in
    ('document', 'photo', 'video', 'audio', 'communication', 'physical', 'digital_forensic', 'testimony', 'public_record', 'other')),
  source_id uuid references public.sources(id),
  source_locator text,
  captured_at timestamptz,
  event_date timestamptz,
  record_date timestamptz,
  collector text,
  custodian text,
  artifact_ref text,
  artifact_hash text,
  provenance_status text not null default 'unknown' check (provenance_status in
    ('verified', 'reported', 'inferred', 'disputed', 'unknown', 'superseded')),
  identity_match_status text not null default 'unresolved' check (identity_match_status in
    ('confirmed', 'probable', 'possible', 'unresolved', 'excluded')),
  relevance text check (relevance in ('high', 'medium', 'low', 'not_relevant')),
  authentication_status text not null default 'unauthenticated' check (authentication_status in
    ('authenticated', 'stipulated', 'disputed', 'unauthenticated', 'not_applicable')),
  review_state text not null default 'new' check (review_state in ('new', 'under_review', 'reviewed', 'flagged', 'excluded')),
  is_excluded boolean not null default false,
  excluded_reason text,
  superseded_by uuid references public.evidence(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, evidence_number)
);

create index evidence_matter_id_idx on public.evidence(matter_id);
create index evidence_review_state_idx on public.evidence(matter_id, review_state);

-- Annotations/analyst notes are stored separately from the original artifact
-- record above, never mixed into it.
create table public.evidence_annotations (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index evidence_annotations_evidence_id_idx on public.evidence_annotations(evidence_id);

alter table public.evidence enable row level security;
create policy "evidence_select" on public.evidence for select to authenticated using (public.is_matter_member(matter_id));
create policy "evidence_insert" on public.evidence for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "evidence_update" on public.evidence for update to authenticated using (public.is_matter_member(matter_id));
-- No delete policy: exclusion is a status flip (is_excluded/review_state), never a row removal.

alter table public.evidence_annotations enable row level security;
create policy "evidence_annotations_select" on public.evidence_annotations for select to authenticated using (public.is_matter_member(matter_id));
create policy "evidence_annotations_insert" on public.evidence_annotations for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "evidence_annotations_update" on public.evidence_annotations for update to authenticated using (public.is_matter_member(matter_id));
