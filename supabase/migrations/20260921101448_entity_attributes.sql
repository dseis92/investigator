-- Depends on evidence(id), so it must be applied after evidence exists.
create table public.entity_attributes (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  attribute_key text not null,
  attribute_value text not null,
  status text not null default 'reported' check (status in
    ('verified', 'reported', 'inferred', 'disputed', 'unknown', 'superseded')),
  evidence_id uuid references public.evidence(id),
  superseded_by uuid references public.entity_attributes(id),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entity_attributes_matter_id_idx on public.entity_attributes(matter_id);
create index entity_attributes_subject_id_idx on public.entity_attributes(subject_id);

alter table public.entity_attributes enable row level security;
create policy "entity_attributes_select" on public.entity_attributes for select to authenticated using (public.is_matter_member(matter_id));
create policy "entity_attributes_insert" on public.entity_attributes for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "entity_attributes_update" on public.entity_attributes for update to authenticated using (public.is_matter_member(matter_id));
