-- A single link row points at exactly one of subject/event/proposition/statement,
-- enforced by Postgres rather than application code.
create table public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  proposition_id uuid references public.propositions(id) on delete cascade,
  statement_id uuid references public.statements(id) on delete cascade,
  relationship text not null check (relationship in
    ('supports', 'contradicts', 'mentions', 'authenticates', 'establishes_provenance', 'other')),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint evidence_links_single_target check (
    num_nonnulls(subject_id, event_id, proposition_id, statement_id) = 1
  )
);

create index evidence_links_matter_id_idx on public.evidence_links(matter_id);
create index evidence_links_evidence_id_idx on public.evidence_links(evidence_id);
create index evidence_links_proposition_id_idx on public.evidence_links(proposition_id) where proposition_id is not null;
create index evidence_links_event_id_idx on public.evidence_links(event_id) where event_id is not null;
create index evidence_links_subject_id_idx on public.evidence_links(subject_id) where subject_id is not null;

alter table public.evidence_links enable row level security;
create policy "evidence_links_select" on public.evidence_links for select to authenticated using (public.is_matter_member(matter_id));
create policy "evidence_links_insert" on public.evidence_links for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "evidence_links_delete" on public.evidence_links for delete to authenticated using (public.is_matter_member(matter_id));
