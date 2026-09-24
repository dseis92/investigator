-- MatterPilot scheduled operations engine.
-- The Vercel Cron route calls the SECURITY DEFINER function below with the
-- service role. Ordinary authenticated clients cannot invoke it directly.

alter table public.matter_notifications
  add column if not exists dedupe_key text;

create unique index if not exists matter_notifications_recipient_dedupe_idx
  on public.matter_notifications(recipient_id, dedupe_key)
  where dedupe_key is not null;

create table if not exists public.appointment_task_template_runs (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  template_id uuid not null,
  appointment_id uuid not null,
  task_id uuid,
  scheduled_for timestamptz not null,
  status text not null default 'materialized' check (status in ('materialized', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (matter_id, template_id, appointment_id, scheduled_for),
  foreign key (matter_id, template_id)
    references public.appointment_task_templates(matter_id, id) on delete cascade,
  foreign key (matter_id, appointment_id)
    references public.appointments(matter_id, id) on delete cascade,
  foreign key (matter_id, task_id)
    references public.appointment_tasks(matter_id, id) on delete set null
);

create index if not exists appointment_task_template_runs_template_idx
  on public.appointment_task_template_runs(matter_id, template_id, scheduled_for desc);

alter table public.appointment_task_template_runs enable row level security;
create policy "appointment_task_template_runs_select_members"
  on public.appointment_task_template_runs for select to authenticated
  using (public.is_matter_member(matter_id));

create or replace function public.run_matterpilot_operations(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template record;
  v_appointment record;
  v_task_id uuid;
  v_next_run timestamptz;
  v_member record;
  v_task record;
  v_deadline record;
  v_tasks_materialized integer := 0;
  v_notifications_created integer := 0;
begin
  -- Prevent two overlapping cron invocations from materializing the same work.
  if not pg_try_advisory_xact_lock(hashtext('matterpilot.operations')) then
    return jsonb_build_object('status', 'already_running', 'tasks_materialized', 0, 'notifications_created', 0);
  end if;

  for v_template in
    select t.*
    from public.appointment_task_templates t
    where t.active = true
      and t.next_run_at is not null
      and t.next_run_at <= p_now
    order by t.next_run_at asc
    limit 200
  loop
    select a.id, a.starts_at, a.ends_at
      into v_appointment
    from public.appointments a
    where a.matter_id = v_template.matter_id
      and a.status <> 'cancelled'
      and a.starts_at >= v_template.next_run_at
    order by a.starts_at asc
    limit 1;

    if found then
      if not exists (
        select 1
        from public.appointment_task_template_runs r
        where r.matter_id = v_template.matter_id
          and r.template_id = v_template.id
          and r.appointment_id = v_appointment.id
          and r.scheduled_for = v_template.next_run_at
          and r.status = 'materialized'
      ) then
        begin
          insert into public.appointment_tasks (
            matter_id, appointment_id, label, is_blocking, due_at, assigned_to, created_by
          ) values (
            v_template.matter_id,
            v_appointment.id,
            v_template.label,
            v_template.is_blocking,
            v_appointment.starts_at,
            v_template.assigned_to,
            v_template.created_by
          )
          returning id into v_task_id;

          insert into public.appointment_task_template_runs (
            matter_id, template_id, appointment_id, task_id, scheduled_for, status
          ) values (
            v_template.matter_id,
            v_template.id,
            v_appointment.id,
            v_task_id,
            v_template.next_run_at,
            'materialized'
          )
          on conflict (matter_id, template_id, appointment_id, scheduled_for)
          do nothing;

          v_next_run := v_template.next_run_at;
          if v_template.frequency = 'weekly' then
            v_next_run := v_next_run + make_interval(days => v_template.interval_count * 7);
          elsif v_template.frequency = 'monthly' then
            v_next_run := v_next_run + make_interval(months => v_template.interval_count);
          else
            v_next_run := v_appointment.ends_at;
          end if;

          while v_next_run <= p_now and v_template.frequency in ('weekly', 'monthly') loop
            if v_template.frequency = 'weekly' then
              v_next_run := v_next_run + make_interval(days => v_template.interval_count * 7);
            else
              v_next_run := v_next_run + make_interval(months => v_template.interval_count);
            end if;
          end loop;

          update public.appointment_task_templates
          set next_run_at = v_next_run, updated_at = p_now
          where matter_id = v_template.matter_id and id = v_template.id;

          v_tasks_materialized := v_tasks_materialized + 1;
        exception when others then
          insert into public.appointment_task_template_runs (
            matter_id, template_id, appointment_id, scheduled_for, status, error_message
          ) values (
            v_template.matter_id,
            v_template.id,
            v_appointment.id,
            v_template.next_run_at,
            'failed',
            sqlerrm
          )
          on conflict (matter_id, template_id, appointment_id, scheduled_for)
          do update set status = 'failed', error_message = excluded.error_message;
        end;
      end if;
    end if;
  end loop;

  -- One durable, unread notification per recipient and overdue record.
  for v_task in
    select t.id, t.matter_id, t.label, m.name as matter_name
    from public.appointment_tasks t
    join public.matters m on m.id = t.matter_id
    where t.status = 'open' and t.due_at is not null and t.due_at < p_now
  loop
    for v_member in
      select mm.user_id
      from public.matter_members mm
      where mm.matter_id = v_task.matter_id
    loop
      insert into public.matter_notifications (
        matter_id, recipient_id, kind, title, body, href, dedupe_key
      ) values (
        v_task.matter_id,
        v_member.user_id,
        'task_due',
        'Overdue task: ' || v_task.label,
        coalesce(v_task.matter_name, 'Matter') || ' has an open task past its due date.',
        '/matterpilot#tasks',
        'task_due:' || v_task.id::text
      )
      on conflict (recipient_id, dedupe_key) do nothing;
      if found then v_notifications_created := v_notifications_created + 1; end if;
    end loop;
  end loop;

  for v_deadline in
    select d.id, d.matter_id, d.title, m.name as matter_name
    from public.matter_deadlines d
    join public.matters m on m.id = d.matter_id
    where d.status = 'open' and d.due_at < p_now
  loop
    for v_member in
      select mm.user_id
      from public.matter_members mm
      where mm.matter_id = v_deadline.matter_id
    loop
      insert into public.matter_notifications (
        matter_id, recipient_id, kind, title, body, href, dedupe_key
      ) values (
        v_deadline.matter_id,
        v_member.user_id,
        'deadline_due',
        'Missed deadline: ' || v_deadline.title,
        coalesce(v_deadline.matter_name, 'Matter') || ' has an open deadline past its due date.',
        '/matterpilot#deadlines',
        'deadline_due:' || v_deadline.id::text
      )
      on conflict (recipient_id, dedupe_key) do nothing;
      if found then v_notifications_created := v_notifications_created + 1; end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'status', 'completed',
    'tasks_materialized', v_tasks_materialized,
    'notifications_created', v_notifications_created,
    'ran_at', p_now
  );
end;
$$;

revoke all on function public.run_matterpilot_operations(timestamptz) from public, anon, authenticated;
grant execute on function public.run_matterpilot_operations(timestamptz) to service_role;
