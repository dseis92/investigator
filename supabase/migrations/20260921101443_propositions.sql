create table public.propositions (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  statement text not null,
  status text not null default 'unresolved' check (status in ('supported', 'contradicted', 'unresolved', 'excluded')),
  assumptions text,
  next_action text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index propositions_matter_id_idx on public.propositions(matter_id);
create index propositions_question_id_idx on public.propositions(question_id);

alter table public.propositions enable row level security;
create policy "propositions_select" on public.propositions for select to authenticated using (public.is_matter_member(matter_id));
create policy "propositions_insert" on public.propositions for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "propositions_update" on public.propositions for update to authenticated using (public.is_matter_member(matter_id));
