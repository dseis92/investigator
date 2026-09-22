-- MatterPilot ready-made document drafts.
-- Drafts are private to the matter and remain attorney-reviewed working copies.

create table public.appointment_document_drafts (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_document_id uuid not null,
  template_key text not null,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'final')),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (appointment_document_id),
  foreign key (matter_id, appointment_document_id)
    references public.appointment_documents(matter_id, id) on delete cascade
);

create index appointment_document_drafts_matter_idx
  on public.appointment_document_drafts(matter_id, updated_at desc);

alter table public.appointment_document_drafts enable row level security;

create policy "appointment_document_drafts_select_members"
  on public.appointment_document_drafts for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "appointment_document_drafts_write_roles"
  on public.appointment_document_drafts for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
