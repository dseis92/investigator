-- MatterPilot: internal intake review and conflict-check decisions.

alter table public.booking_requests
  drop constraint if exists booking_requests_status_check;

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in ('pending', 'needs_info', 'accepted', 'declined', 'spam'));

create table public.intake_reviews (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  booking_request_id uuid not null,
  reviewer_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('pending', 'needs_info', 'accepted', 'declined')),
  conflict_status text not null default 'pending' check (conflict_status in ('pending', 'clear', 'possible_conflict')),
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (booking_request_id),
  foreign key (matter_id, booking_request_id) references public.booking_requests(matter_id, id) on delete cascade
);

create index intake_reviews_matter_request_idx on public.intake_reviews(matter_id, booking_request_id);

alter table public.intake_reviews enable row level security;

create policy "intake_reviews_select_members"
  on public.intake_reviews for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "intake_reviews_write_roles"
  on public.intake_reviews for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
