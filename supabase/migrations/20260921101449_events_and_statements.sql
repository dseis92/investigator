create table public.events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  title text not null,
  description text,
  event_start timestamptz not null,
  event_end timestamptz,
  confidence text not null default 'reported' check (confidence in
    ('verified', 'reported', 'inferred', 'disputed', 'unknown', 'superseded')),
  category text check (category in ('fact', 'statement', 'filing', 'communication', 'other')),
  favorability text not null default 'neutral' check (favorability in ('adverse', 'favorable', 'neutral')),
  primary_evidence_id uuid references public.evidence(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_matter_id_start_idx on public.events(matter_id, event_start);

create table public.statements (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  subject_id uuid references public.subjects(id),
  evidence_id uuid not null references public.evidence(id),
  content text not null,
  statement_date timestamptz,
  status text not null default 'reported' check (status in
    ('verified', 'reported', 'inferred', 'disputed', 'unknown', 'superseded')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index statements_matter_id_idx on public.statements(matter_id);

alter table public.events enable row level security;
create policy "events_select" on public.events for select to authenticated using (public.is_matter_member(matter_id));
create policy "events_insert" on public.events for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "events_update" on public.events for update to authenticated using (public.is_matter_member(matter_id));

alter table public.statements enable row level security;
create policy "statements_select" on public.statements for select to authenticated using (public.is_matter_member(matter_id));
create policy "statements_insert" on public.statements for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "statements_update" on public.statements for update to authenticated using (public.is_matter_member(matter_id));
