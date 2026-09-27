-- MatterPilot: client identity and matter-level conflict posture.

alter table public.matters
  add column if not exists client_name text,
  add column if not exists client_email text,
  add column if not exists client_phone text,
  add column if not exists conflict_status text not null default 'not_started',
  add column if not exists conflict_note text,
  add column if not exists engagement_status text not null default 'not_started';

alter table public.matters
  drop constraint if exists matters_conflict_status_check;

alter table public.matters
  add constraint matters_conflict_status_check
  check (conflict_status in ('not_started', 'pending', 'clear', 'possible_conflict', 'waived'));

alter table public.matters
  drop constraint if exists matters_engagement_status_check;

alter table public.matters
  add constraint matters_engagement_status_check
  check (engagement_status in ('not_started', 'draft', 'sent', 'signed'));
