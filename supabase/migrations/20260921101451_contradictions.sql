-- Contradictions are displayed neutrally: side A/side B labels, never a
-- built-in "which one is the lie" judgment.
create table public.contradictions (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  title text not null,
  conflict_type text not null check (conflict_type in ('factual', 'temporal', 'testimonial', 'documentary', 'other')),
  side_a_label text not null,
  side_a_summary text not null,
  side_b_label text not null,
  side_b_summary text not null,
  statement_a_id uuid references public.statements(id),
  statement_b_id uuid references public.statements(id),
  proposition_a_id uuid references public.propositions(id),
  proposition_b_id uuid references public.propositions(id),
  plausible_alternative_explanations text,
  missing_evidence text,
  impact_if_a text,
  impact_if_b text,
  resolution_status text not null default 'unresolved' check (resolution_status in
    ('unresolved', 'resolved_a', 'resolved_b', 'partially_resolved', 'cannot_resolve')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contradictions_matter_id_idx on public.contradictions(matter_id);

create table public.contradiction_evidence (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  contradiction_id uuid not null references public.contradictions(id) on delete cascade,
  side text not null check (side in ('a', 'b')),
  evidence_id uuid not null references public.evidence(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (contradiction_id, side, evidence_id)
);

create index contradiction_evidence_contradiction_id_idx on public.contradiction_evidence(contradiction_id);

-- Fixed adversarial-review checklist, one row per contradiction.
create table public.contradiction_reviews (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  contradiction_id uuid not null unique references public.contradictions(id) on delete cascade,
  weakest_assumption text,
  evidence_against_theory text,
  correlation_vs_causation text,
  absence_of_evidence_check text,
  opposing_counsel_attack text,
  fact_that_would_weaken_conclusion text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contradictions enable row level security;
create policy "contradictions_select" on public.contradictions for select to authenticated using (public.is_matter_member(matter_id));
create policy "contradictions_insert" on public.contradictions for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "contradictions_update" on public.contradictions for update to authenticated using (public.is_matter_member(matter_id));

alter table public.contradiction_evidence enable row level security;
create policy "contradiction_evidence_select" on public.contradiction_evidence for select to authenticated using (public.is_matter_member(matter_id));
create policy "contradiction_evidence_insert" on public.contradiction_evidence for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "contradiction_evidence_delete" on public.contradiction_evidence for delete to authenticated using (public.is_matter_member(matter_id));

alter table public.contradiction_reviews enable row level security;
create policy "contradiction_reviews_select" on public.contradiction_reviews for select to authenticated using (public.is_matter_member(matter_id));
create policy "contradiction_reviews_insert" on public.contradiction_reviews for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "contradiction_reviews_update" on public.contradiction_reviews for update to authenticated using (public.is_matter_member(matter_id));
