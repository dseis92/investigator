create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  subject_type text not null check (subject_type in
    ('person', 'business', 'organization', 'account', 'address', 'document', 'witness', 'expert', 'event', 'case')),
  display_name text not null,
  summary text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subjects_matter_id_idx on public.subjects(matter_id);

alter table public.subjects enable row level security;
create policy "subjects_select" on public.subjects for select to authenticated using (public.is_matter_member(matter_id));
create policy "subjects_insert" on public.subjects for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "subjects_update" on public.subjects for update to authenticated using (public.is_matter_member(matter_id));
