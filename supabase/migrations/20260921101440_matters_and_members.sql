-- TraceLine: matters, matter_members, and the RLS helper functions/RPC every
-- later matter-owned table relies on.
create table public.matters (
  id uuid primary key default gen_random_uuid(),
  matter_number text not null unique,
  name text not null,
  case_mode text not null check (case_mode in ('criminal_defense', 'civil_defense')),
  jurisdiction text,
  venue text,
  status text not null default 'active' check (status in ('active', 'on_hold', 'closed', 'archived')),
  next_deadline_at timestamptz,
  defense_theory text,
  opposing_theory text,
  alternative_explanations text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matter_members (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('attorney', 'investigator', 'paralegal', 'litigation_support', 'expert', 'admin')),
  created_at timestamptz not null default now(),
  unique (matter_id, user_id)
);

create index matter_members_matter_id_idx on public.matter_members(matter_id);
create index matter_members_user_id_idx on public.matter_members(user_id);

-- Every RLS policy on every matter-owned table below is built on these two
-- functions, so matter-level access control is enforced in exactly one place.
create function public.is_matter_member(p_matter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matter_members
    where matter_id = p_matter_id and user_id = auth.uid()
  );
$$;

create function public.has_matter_role(p_matter_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matter_members
    where matter_id = p_matter_id and user_id = auth.uid() and role = any(p_roles)
  );
$$;

-- Matter creation is atomic: create the matter and add the creator as a
-- member in one transaction. matters has no direct INSERT policy — this RPC
-- is the only way to create one.
create function public.create_matter(
  p_matter_number text,
  p_name text,
  p_case_mode text,
  p_jurisdiction text default null,
  p_venue text default null,
  p_role text default 'attorney'
)
returns public.matters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matter public.matters;
begin
  insert into public.matters (matter_number, name, case_mode, jurisdiction, venue, created_by)
  values (p_matter_number, p_name, p_case_mode, p_jurisdiction, p_venue, auth.uid())
  returning * into v_matter;

  insert into public.matter_members (matter_id, user_id, role)
  values (v_matter.id, auth.uid(), p_role);

  return v_matter;
end;
$$;

alter table public.matters enable row level security;
alter table public.matter_members enable row level security;

create policy "matters_select_members" on public.matters
  for select to authenticated using (public.is_matter_member(id));
create policy "matters_update_members" on public.matters
  for update to authenticated using (public.is_matter_member(id));
-- No insert policy on matters: creation only via create_matter().

create policy "matter_members_select" on public.matter_members
  for select to authenticated using (public.is_matter_member(matter_id));
create policy "matter_members_insert_attorney_admin" on public.matter_members
  for insert to authenticated with check (public.has_matter_role(matter_id, array['attorney', 'admin']));
create policy "matter_members_update_attorney_admin" on public.matter_members
  for update to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin']));
create policy "matter_members_delete_attorney_admin" on public.matter_members
  for delete to authenticated using (public.has_matter_role(matter_id, array['attorney', 'admin']));
