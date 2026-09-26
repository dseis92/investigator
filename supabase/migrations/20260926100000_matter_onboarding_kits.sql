-- MatterPilot: reusable matter onboarding kits.
-- These records are intentionally separate from appointment preparation: a new
-- matter needs a setup queue before its first appointment exists.

alter table public.matters
  add column if not exists practice_area text;

create table if not exists public.matter_onboarding_items (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  item_type text not null check (item_type in ('task', 'document')),
  title text not null check (char_length(trim(title)) between 2 and 240),
  status text not null default 'open' check (status in ('open', 'completed', 'waived')),
  is_required boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id)
);

create index if not exists matter_onboarding_items_matter_idx
  on public.matter_onboarding_items(matter_id, status, item_type, created_at);

alter table public.matter_onboarding_items enable row level security;

create policy "matter_onboarding_items_select_members"
  on public.matter_onboarding_items for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "matter_onboarding_items_write_roles"
  on public.matter_onboarding_items for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
