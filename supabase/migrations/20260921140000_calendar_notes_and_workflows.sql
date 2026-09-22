-- MatterPilot: firm-calendar notes and workflow selection.
-- A quick calendar note may intentionally have no matter. Matterless notes are
-- private to their creator; matter-linked notes remain matter-member scoped.

alter table public.appointments
  add column workflow_key text not null default 'custom'
  check (workflow_key in (
    'initial_consultation', 'client_meeting', 'deposition_preparation',
    'mediation', 'court_appearance', 'expert_consultation', 'witness_interview',
    'internal_case_conference', 'filing_deadline', 'custom'
  ));

create table public.calendar_notes (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid references public.matters(id) on delete cascade,
  title text not null,
  note text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index calendar_notes_creator_starts_idx on public.calendar_notes(created_by, starts_at);
create index calendar_notes_matter_starts_idx on public.calendar_notes(matter_id, starts_at);

alter table public.calendar_notes enable row level security;

create policy "calendar_notes_select_owner_or_matter_member"
  on public.calendar_notes for select to authenticated
  using (
    created_by = auth.uid()
    or (matter_id is not null and public.is_matter_member(matter_id))
  );

create policy "calendar_notes_insert_owner_and_member"
  on public.calendar_notes for insert to authenticated
  with check (
    created_by = auth.uid()
    and (matter_id is null or public.is_matter_member(matter_id))
  );

create policy "calendar_notes_update_owner"
  on public.calendar_notes for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid() and (matter_id is null or public.is_matter_member(matter_id)));

create policy "calendar_notes_delete_owner"
  on public.calendar_notes for delete to authenticated
  using (created_by = auth.uid());
