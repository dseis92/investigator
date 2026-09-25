-- Durable, idempotent email delivery for the provider-neutral communications outbox.
-- The service-role cron worker claims rows, sends them through the configured
-- provider, and records the result without exposing provider credentials to the browser.

alter table public.appointment_communications
  add column if not exists attempt_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists provider_response jsonb;

alter table public.appointment_communications
  drop constraint if exists appointment_communications_status_check;

alter table public.appointment_communications
  add constraint appointment_communications_status_check
  check (status in ('draft', 'queued', 'sending', 'sent', 'failed', 'cancelled'));

create index if not exists appointment_communications_delivery_idx
  on public.appointment_communications(status, next_attempt_at, created_at)
  where channel = 'email' and direction = 'outbound' and status in ('queued', 'sending');

create or replace function public.claim_matterpilot_email_communications(
  p_now timestamptz default now(),
  p_limit integer default 20
)
returns setof public.appointment_communications
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.appointment_communications communication
  set status = 'sending',
      attempt_count = communication.attempt_count + 1,
      last_attempt_at = p_now,
      updated_at = p_now
  where communication.id in (
    select candidate.id
    from public.appointment_communications candidate
    where candidate.channel = 'email'
      and candidate.direction = 'outbound'
      and (
        (candidate.status = 'queued' and candidate.next_attempt_at <= p_now)
        or (
          candidate.status = 'sending'
          and candidate.last_attempt_at is not null
          and candidate.last_attempt_at <= p_now - interval '15 minutes'
        )
      )
    order by candidate.created_at asc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  )
  returning communication.*;
end;
$$;

revoke all on function public.claim_matterpilot_email_communications(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.claim_matterpilot_email_communications(timestamptz, integer) to service_role;
