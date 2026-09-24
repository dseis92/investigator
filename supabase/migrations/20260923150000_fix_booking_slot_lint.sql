-- Remove the redundant loop-variable declaration from the public slot
-- generator. PostgreSQL creates the integer loop variable automatically.

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
