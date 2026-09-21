-- The audit trail itself: append-only, never updated or deleted at the
-- application layer (no update/delete policy is granted at all).
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  entity_type text not null check (entity_type in
    ('matter', 'question', 'proposition', 'subject', 'entity_attribute', 'lead', 'source', 'evidence',
     'evidence_link', 'event', 'statement', 'contradiction', 'analysis', 'analysis_conclusion',
     'report', 'review_decision', 'matter_member')),
  entity_id uuid not null,
  action text not null check (action in
    ('create', 'update', 'correct', 'exclude', 'restore', 'supersede', 'delete', 'status_change', 'review')),
  summary text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_matter_id_created_idx on public.audit_events(matter_id, created_at desc);

alter table public.audit_events enable row level security;
create policy "audit_events_select" on public.audit_events for select to authenticated using (public.is_matter_member(matter_id));
create policy "audit_events_insert" on public.audit_events for insert to authenticated with check (public.is_matter_member(matter_id));
