create table public.leads (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  question_id uuid references public.questions(id) on delete set null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'dead_end')),
  assigned_to uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_matter_id_idx on public.leads(matter_id);
create index leads_status_idx on public.leads(matter_id, status);

alter table public.leads enable row level security;
create policy "leads_select" on public.leads for select to authenticated using (public.is_matter_member(matter_id));
create policy "leads_insert" on public.leads for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "leads_update" on public.leads for update to authenticated using (public.is_matter_member(matter_id));
