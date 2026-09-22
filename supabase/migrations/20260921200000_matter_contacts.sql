-- MatterPilot client and contact command center.
-- Contacts are matter-scoped so people never leak across a firm's matters.

create table public.matter_contacts (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  display_name text not null,
  contact_type text not null default 'other' check (contact_type in ('client', 'prospective_client', 'witness', 'expert', 'opposing_counsel', 'other')),
  email text,
  phone text,
  notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id)
);

create index matter_contacts_matter_name_idx
  on public.matter_contacts(matter_id, lower(display_name));

alter table public.matter_contacts enable row level security;

create policy "matter_contacts_select_members"
  on public.matter_contacts for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "matter_contacts_write_roles"
  on public.matter_contacts for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

-- Make the command center useful immediately for existing MatterPilot data.
insert into public.matter_contacts (matter_id, display_name, contact_type, email, created_by)
select distinct on (ap.matter_id, lower(ap.display_name), ap.participant_role)
  ap.matter_id,
  ap.display_name,
  case ap.participant_role
    when 'client' then 'client'
    when 'witness' then 'witness'
    when 'expert' then 'expert'
    when 'opposing_counsel' then 'opposing_counsel'
    else 'other'
  end,
  ap.email,
  a.created_by
from public.appointment_participants ap
join public.appointments a on a.id = ap.appointment_id and a.matter_id = ap.matter_id
where not exists (
  select 1 from public.matter_contacts mc
  where mc.matter_id = ap.matter_id
    and lower(mc.display_name) = lower(ap.display_name)
    and mc.contact_type = case ap.participant_role
      when 'client' then 'client'
      when 'witness' then 'witness'
      when 'expert' then 'expert'
      when 'opposing_counsel' then 'opposing_counsel'
      else 'other'
    end
)
order by ap.matter_id, lower(ap.display_name), ap.participant_role, ap.created_at;
