-- Firm security visibility: active/suspended membership, last activity, and
-- an append-only administrator-visible event stream.

alter table public.firm_members
  add column if not exists status text not null default 'active' check (status in ('active', 'suspended')),
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles(id),
  add column if not exists last_active_at timestamptz;

update public.firm_members set last_active_at = coalesce(last_active_at, created_at);

create table public.firm_security_events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  event_type text not null check (event_type in ('member_suspended', 'member_reactivated', 'member_role_changed', 'member_removed', 'invitation_created', 'invitation_revoked', 'invitation_accepted')),
  target_user_id uuid references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index firm_security_events_firm_created_idx on public.firm_security_events(firm_id, created_at desc);
alter table public.firm_security_events enable row level security;
create policy firm_security_events_admin_read on public.firm_security_events for select to authenticated using (public.is_firm_admin(firm_id));
revoke insert, update, delete on public.firm_security_events from authenticated, anon;

create or replace function public.is_firm_member(p_firm_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.firm_members where firm_id = p_firm_id and user_id = auth.uid() and status = 'active')
$$;

create or replace function public.is_firm_admin(p_firm_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.firm_members where firm_id = p_firm_id and user_id = auth.uid() and role = 'admin' and status = 'active')
$$;

create function public.log_firm_security_event(p_firm_id uuid, p_event_type text, p_target_user_id uuid default null, p_details jsonb default '{}'::jsonb) returns public.firm_security_events
language plpgsql security definer set search_path = '' as $$
declare v_event public.firm_security_events;
begin
  if auth.uid() is null or not public.is_firm_admin(p_firm_id) then raise exception 'Only an active firm administrator can record security events.' using errcode = '42501'; end if;
  insert into public.firm_security_events(firm_id, actor_id, event_type, target_user_id, details)
  values(p_firm_id, auth.uid(), p_event_type, p_target_user_id, coalesce(p_details, '{}'::jsonb)) returning * into v_event;
  return v_event;
end;
$$;
revoke all on function public.log_firm_security_event(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.log_firm_security_event(uuid, text, uuid, jsonb) to authenticated;

create function public.set_firm_member_status(p_firm_id uuid, p_user_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_firm_admin(p_firm_id) or p_user_id = auth.uid() then raise exception 'Only an administrator can change another team member status.' using errcode = '42501'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'Choose a valid member status.'; end if;
  update public.firm_members set status = p_status, suspended_at = case when p_status = 'suspended' then now() else null end, suspended_by = case when p_status = 'suspended' then auth.uid() else null end where firm_id = p_firm_id and user_id = p_user_id;
  if not found then raise exception 'Team member not found.'; end if;
  perform public.log_firm_security_event(p_firm_id, case when p_status = 'suspended' then 'member_suspended' else 'member_reactivated' end, p_user_id, jsonb_build_object('status', p_status));
end;
$$;
revoke all on function public.set_firm_member_status(uuid, uuid, text) from public, anon;
grant execute on function public.set_firm_member_status(uuid, uuid, text) to authenticated;

create function public.touch_firm_member_activity(p_firm_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.firm_members set last_active_at = now() where firm_id = p_firm_id and user_id = auth.uid() and status = 'active'
$$;
revoke all on function public.touch_firm_member_activity(uuid) from public, anon;
grant execute on function public.touch_firm_member_activity(uuid) to authenticated;
