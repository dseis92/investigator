-- MatterPilot packet tracking and planned reminder schedule.
-- Delivery is intentionally not implied: these rows are the durable schedule
-- that a future email provider will consume.

create table public.appointment_packet_reminders (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  packet_id uuid not null,
  kind text not null check (kind in ('first_reminder', 'final_reminder')),
  send_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned', 'sent', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (packet_id, kind),
  foreign key (matter_id, packet_id) references public.appointment_packets(matter_id, id) on delete cascade
);

create index appointment_packet_reminders_due_idx
  on public.appointment_packet_reminders(status, send_at);

alter table public.appointment_packet_reminders enable row level security;

create policy "appointment_packet_reminders_select_members"
  on public.appointment_packet_reminders for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "appointment_packet_reminders_write_roles"
  on public.appointment_packet_reminders for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create or replace function public.cancel_appointment_packet_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('completed', 'revoked') and old.status is distinct from new.status then
    update public.appointment_packet_reminders
    set status = 'cancelled', updated_at = now()
    where packet_id = new.id and status = 'planned';
  end if;
  return new;
end;
$$;

create trigger appointment_packet_reminders_close_on_packet_status
  after update of status on public.appointment_packets
  for each row execute function public.cancel_appointment_packet_reminders();
