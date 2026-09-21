-- Append-only decision log. entity_type/entity_id is a generic pointer
-- (no FK) since it targets several unrelated tables.
create table public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  entity_type text not null check (entity_type in ('evidence', 'proposition', 'analysis', 'contradiction')),
  entity_id uuid not null,
  decision text not null check (decision in ('approved', 'flagged', 'rejected', 'needs_more_evidence')),
  reviewer_id uuid not null references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create index review_decisions_matter_id_idx on public.review_decisions(matter_id);
create index review_decisions_entity_idx on public.review_decisions(entity_type, entity_id);

alter table public.review_decisions enable row level security;
create policy "review_decisions_select" on public.review_decisions for select to authenticated using (public.is_matter_member(matter_id));
create policy "review_decisions_insert" on public.review_decisions for insert to authenticated with check (public.is_matter_member(matter_id));
