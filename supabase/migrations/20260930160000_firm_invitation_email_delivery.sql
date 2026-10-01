-- Queue firm invitations in the same provider-neutral delivery pattern as
-- appointment email, without pretending a firm invitation belongs to a matter.

create table public.firm_email_communications (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  invitation_id uuid references public.firm_invitations(id) on delete set null,
  recipient text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  provider text,
  provider_message_id text,
  provider_response jsonb,
  error_message text,
  sent_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index firm_email_communications_delivery_idx
  on public.firm_email_communications(status, next_attempt_at, created_at)
  where status in ('queued', 'sending');

alter table public.firm_email_communications enable row level security;

create policy "firm_email_communications_admin_select"
  on public.firm_email_communications for select to authenticated
  using (public.is_firm_admin(firm_id));

create policy "firm_email_communications_admin_insert"
  on public.firm_email_communications for insert to authenticated
  with check (public.is_firm_admin(firm_id) and created_by = auth.uid());

create or replace function public.claim_matterpilot_firm_email_communications(
  p_now timestamptz default now(),
  p_limit integer default 20
)
returns setof public.firm_email_communications
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.firm_email_communications communication
  set status = 'sending',
      attempt_count = communication.attempt_count + 1,
      last_attempt_at = p_now,
      updated_at = p_now
  where communication.id in (
    select candidate.id
    from public.firm_email_communications candidate
    where (candidate.status = 'queued' and candidate.next_attempt_at <= p_now)
       or (candidate.status = 'sending' and candidate.last_attempt_at is not null and candidate.last_attempt_at <= p_now - interval '15 minutes')
    order by candidate.created_at asc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  )
  returning communication.*;
end;
$$;

revoke all on function public.claim_matterpilot_firm_email_communications(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.claim_matterpilot_firm_email_communications(timestamptz, integer) to service_role;
