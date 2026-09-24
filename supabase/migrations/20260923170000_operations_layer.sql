-- MatterPilot operations layer: recurring work, notifications, court rules,
-- calendar connection metadata, time/billing, and AI assistance audit records.

create table public.appointment_task_templates (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  label text not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'after_appointment')),
  interval_count integer not null default 1 check (interval_count between 1 and 52),
  is_blocking boolean not null default true,
  assigned_to uuid references public.profiles(id),
  next_run_at timestamptz,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id)
);

create index appointment_task_templates_due_idx
  on public.appointment_task_templates(matter_id, active, next_run_at);

alter table public.appointment_task_templates enable row level security;
create policy "appointment_task_templates_select_members"
  on public.appointment_task_templates for select to authenticated
  using (public.is_matter_member(matter_id));
create policy "appointment_task_templates_write_roles"
  on public.appointment_task_templates for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create table public.matter_notifications (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('task_due', 'deadline_due', 'appointment_change', 'portal_activity', 'system')),
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (matter_id, id)
);

create index matter_notifications_recipient_idx
  on public.matter_notifications(recipient_id, read_at, created_at desc);

alter table public.matter_notifications enable row level security;
create policy "matter_notifications_select_recipient"
  on public.matter_notifications for select to authenticated
  using (recipient_id = auth.uid() and public.is_matter_member(matter_id));
create policy "matter_notifications_update_recipient"
  on public.matter_notifications for update to authenticated
  using (recipient_id = auth.uid() and public.is_matter_member(matter_id))
  with check (recipient_id = auth.uid() and public.is_matter_member(matter_id));
create policy "matter_notifications_insert_roles"
  on public.matter_notifications for insert to authenticated
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create table public.court_rule_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  jurisdiction text not null,
  trigger_kind text not null check (trigger_kind in ('filing', 'service', 'court_order', 'hearing', 'custom')),
  offset_days integer not null,
  business_days boolean not null default true,
  description text,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.court_rule_definitions enable row level security;
create policy "court_rule_definitions_select_authenticated"
  on public.court_rule_definitions for select to authenticated using (true);
create policy "court_rule_definitions_insert_authenticated"
  on public.court_rule_definitions for insert to authenticated
  with check (created_by = auth.uid());
create policy "court_rule_definitions_update_creator"
  on public.court_rule_definitions for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

alter table public.matter_deadlines
  add column if not exists court_rule_id uuid references public.court_rule_definitions(id),
  add column if not exists trigger_at timestamptz,
  add column if not exists calculation_note text;

create index matter_deadlines_rule_idx
  on public.matter_deadlines(matter_id, court_rule_id, trigger_at);

create table public.calendar_sync_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google', 'outlook')),
  user_id uuid not null references public.profiles(id) on delete cascade,
  matter_id uuid references public.matters(id) on delete cascade,
  status text not null default 'not_connected' check (status in ('not_connected', 'pending', 'connected', 'error', 'revoked')),
  provider_account_email text,
  external_calendar_id text,
  last_sync_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, user_id, matter_id)
);

create table public.calendar_sync_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.calendar_sync_connections(id) on delete cascade,
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid not null,
  external_event_id text not null,
  external_etag text,
  last_pushed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (connection_id, appointment_id),
  foreign key (matter_id, appointment_id)
    references public.appointments(matter_id, id) on delete cascade
);

alter table public.calendar_sync_connections enable row level security;
create policy "calendar_sync_connections_select_owner"
  on public.calendar_sync_connections for select to authenticated
  using (user_id = auth.uid() and (matter_id is null or public.is_matter_member(matter_id)));
create policy "calendar_sync_connections_write_owner"
  on public.calendar_sync_connections for all to authenticated
  using (user_id = auth.uid() and (matter_id is null or public.is_matter_member(matter_id)))
  with check (user_id = auth.uid() and (matter_id is null or public.is_matter_member(matter_id)));

alter table public.calendar_sync_events enable row level security;
create policy "calendar_sync_events_select_owner"
  on public.calendar_sync_events for select to authenticated
  using (public.is_matter_member(matter_id) and exists (
    select 1 from public.calendar_sync_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  ));
create policy "calendar_sync_events_write_owner"
  on public.calendar_sync_events for all to authenticated
  using (public.is_matter_member(matter_id) and exists (
    select 1 from public.calendar_sync_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  ))
  with check (public.is_matter_member(matter_id) and exists (
    select 1 from public.calendar_sync_connections c
    where c.id = connection_id and c.user_id = auth.uid()
  ));

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  appointment_id uuid,
  description text not null,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer not null check (duration_minutes > 0),
  billable boolean not null default true,
  rate_cents integer not null default 0 check (rate_cents >= 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'invoiced', 'void')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (matter_id, appointment_id)
    references public.appointments(matter_id, id) on delete set null
);

create index time_entries_matter_idx on public.time_entries(matter_id, status, created_at desc);
alter table public.time_entries add constraint time_entries_matter_id_id_key unique (matter_id, id);
alter table public.time_entries enable row level security;
create policy "time_entries_select_members"
  on public.time_entries for select to authenticated using (public.is_matter_member(matter_id));
create policy "time_entries_write_roles"
  on public.time_entries for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  issued_at date,
  due_at date,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, invoice_number)
);

alter table public.billing_invoices add constraint billing_invoices_matter_id_id_key unique (matter_id, id);

create table public.billing_invoice_items (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  invoice_id uuid not null,
  time_entry_id uuid,
  description text not null,
  quantity_minutes integer not null check (quantity_minutes > 0),
  rate_cents integer not null check (rate_cents >= 0),
  amount_cents integer generated always as (round(quantity_minutes * rate_cents / 60.0)) stored,
  created_at timestamptz not null default now(),
  foreign key (matter_id, invoice_id)
    references public.billing_invoices(matter_id, id) on delete cascade,
  foreign key (matter_id, time_entry_id)
    references public.time_entries(matter_id, id) on delete set null
);

create index billing_invoice_items_invoice_idx on public.billing_invoice_items(matter_id, invoice_id);

alter table public.billing_invoices enable row level security;
create policy "billing_invoices_select_members"
  on public.billing_invoices for select to authenticated using (public.is_matter_member(matter_id));
create policy "billing_invoices_write_roles"
  on public.billing_invoices for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin']));

alter table public.billing_invoice_items enable row level security;
create policy "billing_invoice_items_select_members"
  on public.billing_invoice_items for select to authenticated using (public.is_matter_member(matter_id));
create policy "billing_invoice_items_write_roles"
  on public.billing_invoice_items for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin']));

create table public.ai_assistance_runs (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  run_type text not null check (run_type in ('matter_brief', 'evidence_summary', 'contradiction_scan', 'timeline_gap_scan', 'missing_document_scan', 'deposition_questions')),
  status text not null default 'draft' check (status in ('draft', 'under_review', 'approved', 'rejected', 'failed')),
  model text,
  prompt_version text not null,
  input_hash text,
  output jsonb not null default '{}'::jsonb,
  redaction_applied boolean not null default true,
  token_count integer,
  error_message text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create index ai_assistance_runs_matter_idx on public.ai_assistance_runs(matter_id, run_type, created_at desc);
alter table public.ai_assistance_runs enable row level security;
create policy "ai_assistance_runs_select_members"
  on public.ai_assistance_runs for select to authenticated using (public.is_matter_member(matter_id));
create policy "ai_assistance_runs_insert_roles"
  on public.ai_assistance_runs for insert to authenticated
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
create policy "ai_assistance_runs_update_roles"
  on public.ai_assistance_runs for update to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator']));
