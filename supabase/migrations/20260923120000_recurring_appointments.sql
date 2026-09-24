-- MatterPilot: recurring appointment series with matter-scoped ownership.

create table public.appointment_series (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  interval_count integer not null default 1 check (interval_count between 1 and 4),
  occurrence_count integer not null check (occurrence_count between 2 and 52),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (matter_id, id)
);

alter table public.appointments
  add column if not exists series_id uuid,
  add column if not exists occurrence_index integer;

alter table public.appointments
  add constraint appointments_series_fk
  foreign key (matter_id, series_id)
  references public.appointment_series(matter_id, id)
  on delete set null;

alter table public.appointments
  add constraint appointments_occurrence_index_check
  check (occurrence_index is null or occurrence_index >= 0);

create index appointment_series_matter_idx on public.appointment_series(matter_id, created_at desc);
create index appointments_series_idx on public.appointments(matter_id, series_id, occurrence_index);

alter table public.appointment_series enable row level security;

create policy "appointment_series_select_members"
  on public.appointment_series for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "appointment_series_write_roles"
  on public.appointment_series for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
