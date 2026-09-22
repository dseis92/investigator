-- MatterPilot communication history and provider-neutral email outbox.
-- The queue is durable and auditable; delivery is intentionally handled by a
-- future email provider worker rather than implied by the UI.

create table public.appointment_communications (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid not null,
  channel text not null check (channel in ('email', 'sms')),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  status text not null default 'draft' check (status in ('draft', 'queued', 'sent', 'failed', 'cancelled')),
  recipient text,
  subject text,
  body text not null,
  provider text,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  foreign key (matter_id, appointment_id) references public.appointments(matter_id, id) on delete cascade
);

create index appointment_communications_appointment_idx
  on public.appointment_communications(matter_id, appointment_id, created_at desc);

create index appointment_communications_outbox_idx
  on public.appointment_communications(status, created_at)
  where status = 'queued';

alter table public.appointment_communications enable row level security;

create policy "appointment_communications_select_members"
  on public.appointment_communications for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "appointment_communications_write_roles"
  on public.appointment_communications for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
