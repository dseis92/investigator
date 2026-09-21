create table public.questions (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  prompt text not null,
  owner_id uuid references public.profiles(id),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'answered', 'closed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index questions_matter_id_idx on public.questions(matter_id);

alter table public.questions enable row level security;
create policy "questions_select" on public.questions for select to authenticated using (public.is_matter_member(matter_id));
create policy "questions_insert" on public.questions for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "questions_update" on public.questions for update to authenticated using (public.is_matter_member(matter_id));
