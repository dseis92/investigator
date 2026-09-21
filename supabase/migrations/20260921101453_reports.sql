-- Append-only generation-event log. report_type covers all 6 required report
-- kinds even though only proposition_evidence_matrix is implemented in v1 —
-- the rest surface as "planned" catalog entries, never fabricated rows.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  report_type text not null check (report_type in
    ('proposition_evidence_matrix', 'master_chronology', 'investigative_memorandum',
     'witness_contradiction_report', 'evidence_source_index', 'case_theory_stress_test')),
  title text not null,
  status text not null default 'available' check (status in ('available', 'planned')),
  filters jsonb,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index reports_matter_id_idx on public.reports(matter_id);

alter table public.reports enable row level security;
create policy "reports_select" on public.reports for select to authenticated using (public.is_matter_member(matter_id));
create policy "reports_insert" on public.reports for insert to authenticated with check (public.is_matter_member(matter_id));
