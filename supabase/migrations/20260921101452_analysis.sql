-- Analysis is deliberately structured so a future AI-assisted draft could
-- populate it (generated_by/ai_model/ai_prompt_ref), but v1 is human-authored
-- only: no AI provider is wired against this schema yet.
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  proposition_id uuid references public.propositions(id),
  question_id uuid references public.questions(id),
  title text not null,
  summary text not null,
  supporting_evidence_summary text,
  contradicting_evidence_summary text,
  missing_evidence_summary text,
  confidence_assessment text check (confidence_assessment in ('high', 'moderate', 'low', 'insufficient')),
  key_assumptions text,
  limitations text,
  recommended_next_steps text,
  generated_by text not null default 'human' check (generated_by in ('human', 'ai')),
  ai_model text,
  ai_prompt_ref text,
  status text not null default 'draft' check (status in ('draft', 'under_review', 'final', 'superseded')),
  authored_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index analyses_matter_id_idx on public.analyses(matter_id);

-- Each conclusion carries its own classification along the required
-- fact/assertion/inference/hypothesis/disputed/unknown vocabulary, distinct
-- from the evidence-level status vocabulary.
create table public.analysis_conclusions (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  conclusion_text text not null,
  classification text not null check (classification in
    ('verified_fact', 'source_reported_assertion', 'analyst_inference', 'hypothesis', 'disputed', 'unknown')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index analysis_conclusions_analysis_id_idx on public.analysis_conclusions(analysis_id);

create table public.analysis_conclusion_evidence (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  conclusion_id uuid not null references public.analysis_conclusions(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id),
  locator_note text,
  created_at timestamptz not null default now(),
  unique (conclusion_id, evidence_id)
);

alter table public.analyses enable row level security;
create policy "analyses_select" on public.analyses for select to authenticated using (public.is_matter_member(matter_id));
create policy "analyses_insert" on public.analyses for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "analyses_update" on public.analyses for update to authenticated using (public.is_matter_member(matter_id));

alter table public.analysis_conclusions enable row level security;
create policy "analysis_conclusions_select" on public.analysis_conclusions for select to authenticated using (public.is_matter_member(matter_id));
create policy "analysis_conclusions_insert" on public.analysis_conclusions for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "analysis_conclusions_update" on public.analysis_conclusions for update to authenticated using (public.is_matter_member(matter_id));

alter table public.analysis_conclusion_evidence enable row level security;
create policy "analysis_conclusion_evidence_select" on public.analysis_conclusion_evidence for select to authenticated using (public.is_matter_member(matter_id));
create policy "analysis_conclusion_evidence_insert" on public.analysis_conclusion_evidence for insert to authenticated with check (public.is_matter_member(matter_id));
