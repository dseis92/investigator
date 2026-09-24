-- MatterPilot: authoritative availability, blackout windows, and conflict-safe booking.

create table public.calendar_availability_rules (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'America/Chicago',
  label text,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  unique (matter_id, weekday, start_time, end_time, timezone),
  check (end_time > start_time)
);

create table public.calendar_blackouts (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matter_id, id),
  check (ends_at > starts_at)
);

create table public.appointment_reschedule_history (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  appointment_id uuid not null,
  previous_starts_at timestamptz not null,
  previous_ends_at timestamptz not null,
  next_starts_at timestamptz not null,
  next_ends_at timestamptz not null,
  reason text,
  changed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (matter_id, id),
  foreign key (matter_id, appointment_id) references public.appointments(matter_id, id) on delete cascade
);

create index calendar_availability_rules_matter_idx on public.calendar_availability_rules(matter_id, weekday, start_time);
create index calendar_blackouts_matter_idx on public.calendar_blackouts(matter_id, starts_at, ends_at);
create index appointment_reschedule_history_appointment_idx on public.appointment_reschedule_history(matter_id, appointment_id, created_at desc);

alter table public.calendar_availability_rules enable row level security;
alter table public.calendar_blackouts enable row level security;
alter table public.appointment_reschedule_history enable row level security;

create policy "calendar_availability_rules_select_members"
  on public.calendar_availability_rules for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "calendar_availability_rules_write_admins"
  on public.calendar_availability_rules for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator']));

create policy "calendar_blackouts_select_members"
  on public.calendar_blackouts for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "calendar_blackouts_write_admins"
  on public.calendar_blackouts for all to authenticated
  using (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator']))
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator']));

create policy "appointment_reschedule_history_select_members"
  on public.appointment_reschedule_history for select to authenticated
  using (public.is_matter_member(matter_id));

create policy "appointment_reschedule_history_insert_roles"
  on public.appointment_reschedule_history for insert to authenticated
  with check (public.has_matter_role(matter_id, array['attorney', 'admin', 'investigator', 'paralegal']));

create or replace function public.calendar_slot_check(
  p_matter_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_ignore_appointment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_has_rules boolean;
  v_rule_match boolean;
  v_conflicting_id uuid;
  v_blackout_reason text;
  v_weekday integer;
begin
  if p_matter_id is null or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    return jsonb_build_object('available', false, 'reason', 'Choose a valid start and end time.');
  end if;

  if auth.uid() is not null and not public.is_matter_member(p_matter_id) then
    return jsonb_build_object('available', false, 'reason', 'That calendar is unavailable.');
  end if;

  select coalesce((array_agg(rule.timezone order by rule.created_at))[1], 'America/Chicago')
    into v_timezone
  from public.calendar_availability_rules rule
  where rule.matter_id = p_matter_id and rule.is_active = true;

  v_timezone := coalesce(v_timezone, 'America/Chicago');
  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end := p_ends_at at time zone v_timezone;
  v_weekday := extract(isodow from v_local_start)::integer;

  if v_local_start::date <> v_local_end::date then
    return jsonb_build_object('available', false, 'reason', 'Appointments must stay within one business day.');
  end if;

  select exists (
    select 1
    from public.calendar_availability_rules rule
    where rule.matter_id = p_matter_id
      and rule.is_active = true
      and rule.weekday = v_weekday
      and rule.start_time <= v_local_start::time
      and rule.end_time >= v_local_end::time
  ) into v_rule_match;

  select exists (
    select 1 from public.calendar_availability_rules rule
    where rule.matter_id = p_matter_id and rule.is_active = true
  ) into v_has_rules;

  if not v_rule_match and v_has_rules then
    return jsonb_build_object('available', false, 'reason', 'That time is outside the configured availability.');
  end if;

  if not v_has_rules and not (v_weekday between 1 and 5 and v_local_start::time >= time '08:00' and v_local_end::time <= time '18:00') then
    return jsonb_build_object('available', false, 'reason', 'That time is outside the default weekday availability.');
  end if;

  select blackout.reason into v_blackout_reason
  from public.calendar_blackouts blackout
  where blackout.matter_id = p_matter_id
    and blackout.status = 'active'
    and blackout.starts_at < p_ends_at
    and blackout.ends_at > p_starts_at
  order by blackout.starts_at
  limit 1;

  if v_blackout_reason is not null then
    return jsonb_build_object('available', false, 'reason', 'That time is blocked: ' || v_blackout_reason);
  end if;

  select appointment.id into v_conflicting_id
  from public.appointments appointment
  where appointment.status <> 'cancelled'
    and appointment.id is distinct from p_ignore_appointment_id
    and (appointment.matter_id = p_matter_id or (auth.uid() is not null and appointment.created_by = auth.uid()))
    and appointment.starts_at < p_ends_at
    and appointment.ends_at > p_starts_at
  order by appointment.starts_at
  limit 1;

  if v_conflicting_id is not null then
    return jsonb_build_object('available', false, 'reason', 'That time overlaps another appointment.', 'conflicting_appointment_id', v_conflicting_id);
  end if;

  return jsonb_build_object('available', true, 'timezone', v_timezone);
end;
$$;

create or replace function public.get_public_booking_slots(
  p_slug text,
  p_appointment_type_name text,
  p_from_date date,
  p_days integer default 5
)
returns table(slot_start timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.booking_pages;
  v_duration integer;
  v_timezone text;
  v_has_rules boolean;
  v_day_offset integer;
  v_date date;
  v_weekday integer;
  v_rule record;
  v_cursor timestamptz;
  v_end timestamptz;
  v_check jsonb;
begin
  select * into v_page
  from public.booking_pages page
  where page.slug = lower(trim(p_slug)) and page.active = true;

  if v_page.id is null then
    return;
  end if;

  select coalesce((select type.duration_minutes from public.appointment_types type where type.matter_id = v_page.matter_id and lower(type.name) = lower(trim(p_appointment_type_name)) limit 1), case when lower(trim(p_appointment_type_name)) = 'initial consultation' then 45 else 60 end)
    into v_duration;
  select coalesce((array_agg(rule.timezone order by rule.created_at))[1], 'America/Chicago')
    into v_timezone
  from public.calendar_availability_rules rule
  where rule.matter_id = v_page.matter_id and rule.is_active = true;
  v_timezone := coalesce(v_timezone, 'America/Chicago');

  select exists (select 1 from public.calendar_availability_rules rule where rule.matter_id = v_page.matter_id and rule.is_active = true) into v_has_rules;

  for v_day_offset in 0..greatest(0, least(coalesce(p_days, 5), 14) - 1) loop
    v_date := p_from_date + v_day_offset;
    v_weekday := extract(isodow from v_date)::integer;

    if v_has_rules then
      for v_rule in
        select rule.start_time, rule.end_time, rule.timezone
        from public.calendar_availability_rules rule
        where rule.matter_id = v_page.matter_id and rule.is_active = true and rule.weekday = v_weekday
        order by rule.start_time
      loop
        v_cursor := (v_date::timestamp + v_rule.start_time) at time zone v_rule.timezone;
        v_end := (v_date::timestamp + v_rule.end_time) at time zone v_rule.timezone;
        while v_cursor + make_interval(mins => v_duration) <= v_end loop
          v_check := public.calendar_slot_check(v_page.matter_id, v_cursor, v_cursor + make_interval(mins => v_duration));
          if (v_check->>'available')::boolean then
            slot_start := v_cursor;
            return next;
          end if;
          v_cursor := v_cursor + interval '30 minutes';
        end loop;
      end loop;
    elsif v_weekday between 1 and 5 then
      v_cursor := (v_date::timestamp + time '09:00') at time zone v_timezone;
      v_end := (v_date::timestamp + time '17:00') at time zone v_timezone;
      while v_cursor + make_interval(mins => v_duration) <= v_end loop
        v_check := public.calendar_slot_check(v_page.matter_id, v_cursor, v_cursor + make_interval(mins => v_duration));
        if (v_check->>'available')::boolean then
          slot_start := v_cursor;
          return next;
        end if;
        v_cursor := v_cursor + interval '30 minutes';
      end loop;
    end if;
  end loop;
end;
$$;

create or replace function public.submit_public_booking_request(
  p_slug text,
  p_appointment_type_name text,
  p_requested_start timestamptz,
  p_full_name text,
  p_email text,
  p_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.booking_pages;
  v_id uuid;
  v_duration integer;
  v_check jsonb;
begin
  if length(trim(p_slug)) < 1 or length(trim(p_full_name)) < 2 or position('@' in p_email) < 2 then
    raise exception 'Valid booking details are required' using errcode = '22023';
  end if;
  if p_requested_start <= now() then
    raise exception 'Choose a future appointment time' using errcode = '22023';
  end if;

  select * into v_page
  from public.booking_pages page
  where page.slug = lower(trim(p_slug)) and page.active = true;
  if v_page.id is null then
    raise exception 'Booking page not found' using errcode = 'P0002';
  end if;

  select coalesce((select type.duration_minutes from public.appointment_types type where type.matter_id = v_page.matter_id and lower(type.name) = lower(trim(p_appointment_type_name)) limit 1), case when lower(trim(p_appointment_type_name)) = 'initial consultation' then 45 else 60 end) into v_duration;
  v_check := public.calendar_slot_check(v_page.matter_id, p_requested_start, p_requested_start + make_interval(mins => v_duration));
  if coalesce((v_check->>'available')::boolean, false) is not true then
    raise exception '%', coalesce(v_check->>'reason', 'That time is no longer available') using errcode = '23P01';
  end if;

  insert into public.booking_requests (matter_id, booking_page_id, appointment_type_name, requested_start, full_name, email, summary)
  values (v_page.matter_id, v_page.id, left(trim(p_appointment_type_name), 120), p_requested_start, left(trim(p_full_name), 160), lower(trim(p_email)), left(nullif(trim(p_summary), ''), 2000))
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.calendar_slot_check(uuid, timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.calendar_slot_check(uuid, timestamptz, timestamptz, uuid) to authenticated;
revoke execute on function public.get_public_booking_slots(text, text, date, integer) from public;
grant execute on function public.get_public_booking_slots(text, text, date, integer) to anon, authenticated;
