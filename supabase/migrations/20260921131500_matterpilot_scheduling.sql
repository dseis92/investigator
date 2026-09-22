-- MatterPilot Phase 2: persistent scheduling, preparation, and public intake.
--
-- Public booking intentionally writes only to booking_requests through a
-- narrow SECURITY DEFINER function. Anonymous callers never receive a matter
-- id, appointment id, client list, or any other private row.

create table public.appointment_types (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  name text not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  category text not null default 'meeting' check (category in ('consultation', 'meeting', 'deposition', 'mediation', 'court', 'expert', 'other')),
  required_checklist jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (matter_id, name)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_type_id uuid references public.appointment_types(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'tentative' check (status in ('tentative', 'confirmed', 'cancelled', 'completed')),
  conflict_status text not null default 'pending' check (conflict_status in ('pending', 'clear', 'issue')),
  location text,
  notes text,
  client_name text,
  client_email text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (matter_id, id),
  foreign key (matter_id, appointment_type_id) references public.appointment_types(matter_id, id)
);

create table public.appointment_participants (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid not null,
  display_name text not null,
  email text,
  participant_role text not null default 'attendee' check (participant_role in ('client', 'attorney', 'witness', 'expert', 'opposing_counsel', 'attendee')),
  response_status text not null default 'pending' check (response_status in ('pending', 'confirmed', 'declined')),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (appointment_id, email),
  foreign key (matter_id, appointment_id) references public.appointments(matter_id, id) on delete cascade
);

create table public.appointment_tasks (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid not null,
  label text not null,
  status text not null default 'open' check (status in ('open', 'done', 'waived')),
  is_blocking boolean not null default true,
  due_at timestamptz,
  assigned_to uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  foreign key (matter_id, appointment_id) references public.appointments(matter_id, id) on delete cascade
);

create table public.appointment_documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid not null,
  name text not null,
  status text not null default 'requested' check (status in ('requested', 'received', 'waived')),
  is_required boolean not null default true,
  requested_at timestamptz not null default now(),
  received_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (matter_id, id),
  foreign key (matter_id, appointment_id) references public.appointments(matter_id, id) on delete cascade
);

create table public.appointment_intake (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid not null,
  full_name text not null,
  email text not null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (appointment_id),
  foreign key (matter_id, appointment_id) references public.appointments(matter_id, id) on delete cascade
);

create table public.appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid not null,
  channel text not null default 'email' check (channel in ('email', 'sms')),
  send_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned', 'sent', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (appointment_id, channel, send_at),
  foreign key (matter_id, appointment_id) references public.appointments(matter_id, id) on delete cascade
);

create table public.booking_pages (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  slug text not null unique,
  firm_name text not null default 'Harbor Legal',
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (matter_id, id)
);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  booking_page_id uuid not null,
  appointment_type_name text not null,
  requested_start timestamptz not null,
  full_name text not null,
  email text not null,
  summary text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'spam')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (matter_id, id),
  foreign key (matter_id, booking_page_id) references public.booking_pages(matter_id, id) on delete cascade
);

create index appointments_matter_starts_idx on public.appointments(matter_id, starts_at);
create index appointment_tasks_appointment_idx on public.appointment_tasks(matter_id, appointment_id);
create index appointment_documents_appointment_idx on public.appointment_documents(matter_id, appointment_id);
create index booking_requests_matter_created_idx on public.booking_requests(matter_id, created_at desc);

alter table public.appointment_types enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_participants enable row level security;
alter table public.appointment_tasks enable row level security;
alter table public.appointment_documents enable row level security;
alter table public.appointment_intake enable row level security;
alter table public.appointment_reminders enable row level security;
alter table public.booking_pages enable row level security;
alter table public.booking_requests enable row level security;

create policy "appointment_types_select_members" on public.appointment_types for select to authenticated using (public.is_matter_member(matter_id));
create policy "appointment_types_write_attorney_admin" on public.appointment_types for all to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator'])) with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator']));

create policy "appointments_select_members" on public.appointments for select to authenticated using (public.is_matter_member(matter_id));
create policy "appointments_insert_roles" on public.appointments for insert to authenticated with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
create policy "appointments_update_roles" on public.appointments for update to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal'])) with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "appointment_participants_select_members" on public.appointment_participants for select to authenticated using (public.is_matter_member(matter_id));
create policy "appointment_participants_write_roles" on public.appointment_participants for all to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal'])) with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "appointment_tasks_select_members" on public.appointment_tasks for select to authenticated using (public.is_matter_member(matter_id));
create policy "appointment_tasks_write_roles" on public.appointment_tasks for all to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal'])) with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "appointment_documents_select_members" on public.appointment_documents for select to authenticated using (public.is_matter_member(matter_id));
create policy "appointment_documents_write_roles" on public.appointment_documents for all to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal'])) with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "appointment_intake_select_members" on public.appointment_intake for select to authenticated using (public.is_matter_member(matter_id));
create policy "appointment_intake_write_roles" on public.appointment_intake for all to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal'])) with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "appointment_reminders_select_members" on public.appointment_reminders for select to authenticated using (public.is_matter_member(matter_id));
create policy "appointment_reminders_write_roles" on public.appointment_reminders for all to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal'])) with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create policy "booking_pages_select_members" on public.booking_pages for select to authenticated using (public.is_matter_member(matter_id));
create policy "booking_pages_write_attorney_admin" on public.booking_pages for all to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin'])) with check (public.has_matter_role(matter_id, array['attorney', 'admin']));

create policy "booking_requests_select_members" on public.booking_requests for select to authenticated using (public.is_matter_member(matter_id));
create policy "booking_requests_update_roles" on public.booking_requests for update to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal'])) with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create or replace function public.submit_public_booking_request(
  p_slug text,
  p_appointment_type_name text,
  p_requested_start timestamptz,
  p_full_name text,
  p_email text,
  p_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.booking_pages;
  v_id uuid;
begin
  if length(trim(p_slug)) < 1 or length(trim(p_full_name)) < 2 or position('@' in p_email) < 2 then
    raise exception 'Valid booking details are required' using errcode = '22023';
  end if;

  select * into v_page
  from public.booking_pages
  where slug = lower(trim(p_slug)) and active = true;

  if v_page.id is null then
    raise exception 'Booking page not found' using errcode = 'P0002';
  end if;

  insert into public.booking_requests (matter_id, booking_page_id, appointment_type_name, requested_start, full_name, email, summary)
  values (v_page.matter_id, v_page.id, left(trim(p_appointment_type_name), 120), p_requested_start, left(trim(p_full_name), 160), lower(trim(p_email)), left(nullif(trim(p_summary), ''), 2000))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_public_booking_request(text, text, timestamptz, text, text, text) from public;
grant execute on function public.submit_public_booking_request(text, text, timestamptz, text, text, text) to anon, authenticated;
