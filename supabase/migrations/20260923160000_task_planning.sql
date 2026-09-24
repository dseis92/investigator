-- MatterPilot Phase 5: task dependency integrity and planning indexes.

create table public.appointment_task_dependencies (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  task_id uuid not null,
  depends_on_task_id uuid not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (matter_id, task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id),
  foreign key (matter_id, task_id)
    references public.appointment_tasks(matter_id, id) on delete cascade,
  foreign key (matter_id, depends_on_task_id)
    references public.appointment_tasks(matter_id, id) on delete cascade
);

create index appointment_tasks_planning_idx
  on public.appointment_tasks(matter_id, status, due_at, assigned_to);

create index appointment_task_dependencies_task_idx
  on public.appointment_task_dependencies(matter_id, task_id);

alter table public.appointment_task_dependencies enable row level security;

create policy "appointment_task_dependencies_select_members"
  on public.appointment_task_dependencies for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "appointment_task_dependencies_write_roles"
  on public.appointment_task_dependencies for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));
