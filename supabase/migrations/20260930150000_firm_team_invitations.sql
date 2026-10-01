-- Firm team administration: expiring invitations and database-enforced membership changes.
alter table public.firm_members
  add column if not exists member_role text not null default 'attorney'
  check (member_role in ('attorney', 'investigator', 'paralegal', 'litigation_support', 'expert'));

create table public.firm_invitations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  member_role text not null default 'attorney' check (member_role in ('admin', 'attorney', 'investigator', 'paralegal', 'litigation_support', 'expert')),
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index firm_invitations_firm_idx on public.firm_invitations(firm_id, created_at desc);
alter table public.firm_invitations enable row level security;
create policy firm_invitations_admin_read on public.firm_invitations for select to authenticated using (public.is_firm_admin(firm_id));
revoke insert, update, delete on public.firm_invitations from authenticated, anon;

create function public.create_firm_invitation(p_firm_id uuid, p_email text, p_member_role text, p_token_hash text) returns public.firm_invitations
language plpgsql security definer set search_path = '' as $$
declare v_invitation public.firm_invitations;
begin
  if auth.uid() is null or not public.is_firm_admin(p_firm_id) then raise exception 'Only a firm administrator can invite team members.' using errcode = '42501'; end if;
  if p_member_role not in ('admin', 'attorney', 'investigator', 'paralegal', 'litigation_support', 'expert') then raise exception 'Choose a valid team role.'; end if;
  if exists (select 1 from public.firm_members fm join public.profiles p on p.id = fm.user_id where fm.firm_id = p_firm_id and lower(p.email) = lower(trim(p_email))) then raise exception 'This person is already on the team.'; end if;
  update public.firm_invitations set revoked_at = now() where firm_id = p_firm_id and email = lower(trim(p_email)) and accepted_at is null and revoked_at is null;
  insert into public.firm_invitations(firm_id, email, member_role, token_hash, invited_by)
  values(p_firm_id, lower(trim(p_email)), p_member_role, p_token_hash, auth.uid()) returning * into v_invitation;
  return v_invitation;
end;
$$;
revoke all on function public.create_firm_invitation(uuid, text, text, text) from public, anon;
grant execute on function public.create_firm_invitation(uuid, text, text, text) to authenticated;

create function public.revoke_firm_invitation(p_invitation_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.firm_invitations set revoked_at = now()
  where id = p_invitation_id and accepted_at is null and revoked_at is null and public.is_firm_admin(firm_id);
  if not found then raise exception 'Invitation is no longer pending or you are not an administrator.' using errcode = '42501'; end if;
end;
$$;
revoke all on function public.revoke_firm_invitation(uuid) from public, anon;
grant execute on function public.revoke_firm_invitation(uuid) to authenticated;

create function public.accept_firm_invitation(p_token_hash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_invitation public.firm_invitations; v_email text;
begin
  if auth.uid() is null then raise exception 'Sign in before accepting an invitation.' using errcode = '42501'; end if;
  select email into v_email from public.profiles where id = auth.uid();
  select * into v_invitation from public.firm_invitations where token_hash = p_token_hash and accepted_at is null and revoked_at is null and expires_at > now() for update;
  if not found then raise exception 'This invitation is expired, revoked, or invalid.'; end if;
  if lower(v_email) <> v_invitation.email then raise exception 'Sign in with the invited email address.' using errcode = '42501'; end if;
  insert into public.firm_members(firm_id, user_id, role, member_role)
  values(v_invitation.firm_id, auth.uid(), case when v_invitation.member_role = 'admin' then 'admin' else 'member' end, case when v_invitation.member_role = 'admin' then 'attorney' else v_invitation.member_role end)
  on conflict (firm_id, user_id) do update set role = excluded.role, member_role = excluded.member_role;
  update public.firm_invitations set accepted_at = now() where id = v_invitation.id;
  return v_invitation.firm_id;
end;
$$;
revoke all on function public.accept_firm_invitation(text) from public, anon;
grant execute on function public.accept_firm_invitation(text) to authenticated;

create function public.update_firm_member(p_firm_id uuid, p_user_id uuid, p_role text, p_member_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_firm_admin(p_firm_id) then raise exception 'Only a firm administrator can update team members.' using errcode = '42501'; end if;
  if p_role not in ('admin', 'member') or p_member_role not in ('attorney', 'investigator', 'paralegal', 'litigation_support', 'expert') then raise exception 'Choose valid team permissions.'; end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then raise exception 'You cannot remove your own administrator access.'; end if;
  update public.firm_members set role = p_role, member_role = p_member_role where firm_id = p_firm_id and user_id = p_user_id;
  if not found then raise exception 'Team member not found.'; end if;
end;
$$;
revoke all on function public.update_firm_member(uuid, uuid, text, text) from public, anon;
grant execute on function public.update_firm_member(uuid, uuid, text, text) to authenticated;

create function public.remove_firm_member(p_firm_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_firm_admin(p_firm_id) or p_user_id = auth.uid() then raise exception 'Only an administrator can remove another team member.' using errcode = '42501'; end if;
  delete from public.firm_members where firm_id = p_firm_id and user_id = p_user_id;
  if not found then raise exception 'Team member not found.'; end if;
end;
$$;
revoke all on function public.remove_firm_member(uuid, uuid) from public, anon;
grant execute on function public.remove_firm_member(uuid, uuid) to authenticated;
