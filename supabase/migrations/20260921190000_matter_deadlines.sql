-- MatterPilot legal deadlines and court-date tracker.
-- This MVP stores explicit dates entered by the legal team. It does not
-- calculate jurisdiction-specific rules or silently create legal obligations.

create table public.matter_deadlines (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  title text not null,
  kind text not null default 'other' check (kind in ('court_date', 'filing', 'discovery', 'client', 'internal', 'other')),
  due_at timestamptz not null,
  priority text not null default 'normal' check (priority in ('normal', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'done', 'waived')),
  notes text,
  assigned_to uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id)
);

create index matter_deadlines_due_idx
  on public.matter_deadlines(matter_id, due_at)
  where status = 'open';

alter table public.matter_deadlines enable row level security;

create policy "matter_deadlines_select_members"
  on public.matter_deadlines for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "matter_deadlines_write_roles"
  on public.matter_deadlines for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
