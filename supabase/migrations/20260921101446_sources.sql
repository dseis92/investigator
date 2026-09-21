create table public.sources (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  source_type text not null check (source_type in
    ('public_record', 'court_filing', 'law_enforcement_report', 'witness_interview',
     'business_record', 'digital_forensics', 'social_media', 'media_report', 'expert_report', 'other')),
  name text not null,
  locator text,
  custodian text,
  reliability_notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sources_matter_id_idx on public.sources(matter_id);

alter table public.sources enable row level security;
create policy "sources_select" on public.sources for select to authenticated using (public.is_matter_member(matter_id));
create policy "sources_insert" on public.sources for insert to authenticated with check (public.is_matter_member(matter_id));
create policy "sources_update" on public.sources for update to authenticated using (public.is_matter_member(matter_id));
