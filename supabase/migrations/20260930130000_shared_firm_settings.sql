-- Shared business identity is separate from personal preferences and matter access.
create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 200),
  contact_email text not null default '' check (contact_email = '' or contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  contact_phone text not null default '' check (char_length(contact_phone) <= 80),
  website text not null default '' check (website = '' or website ~ '^https://[^[:space:]]+$'),
  address text not null default '' check (char_length(address) <= 1000),
  timezone text not null default 'America/Chicago',
  jurisdiction text not null default '' check (char_length(jurisdiction) <= 200),
  brand_color text not null default '#b65f3a' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  document_footer text not null default '' check (char_length(document_footer) <= 2000),
  business_hours jsonb not null default '[{"day":1,"start":"09:00","end":"17:00"},{"day":2,"start":"09:00","end":"17:00"},{"day":3,"start":"09:00","end":"17:00"},{"day":4,"start":"09:00","end":"17:00"},{"day":5,"start":"09:00","end":"17:00"}]',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.firm_members (
  firm_id uuid not null references public.firms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (firm_id, user_id)
);
alter table public.matters add column firm_id uuid references public.firms(id);
create index matters_firm_idx on public.matters(firm_id);
create index firm_members_user_idx on public.firm_members(user_id);
alter table public.calendar_availability_rules add column firm_default boolean not null default false;

create function public.is_firm_member(p_firm_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.firm_members where firm_id = p_firm_id and user_id = auth.uid())
    or exists (select 1 from public.matters m join public.matter_members mm on mm.matter_id = m.id where m.firm_id = p_firm_id and mm.user_id = auth.uid());
$$;
create function public.is_firm_admin(p_firm_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.firm_members where firm_id = p_firm_id and user_id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_firm_member(uuid), public.is_firm_admin(uuid) from public, anon;
grant execute on function public.is_firm_member(uuid), public.is_firm_admin(uuid) to authenticated;

alter table public.firms enable row level security;
alter table public.firm_members enable row level security;
create policy firms_read on public.firms for select to authenticated using (public.is_firm_member(id));
create policy firms_admin_update on public.firms for update to authenticated using (public.is_firm_admin(id)) with check (public.is_firm_admin(id));
create policy firm_members_read on public.firm_members for select to authenticated using (user_id = auth.uid() or public.is_firm_admin(firm_id));
revoke insert, delete on public.firms from authenticated, anon;
revoke insert, update, delete on public.firm_members from authenticated, anon;

create function public.validate_firm_settings() returns trigger
language plpgsql set search_path = '' as $$
declare v_hour jsonb; v_days integer[] := '{}'; v_day integer;
begin
  if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at) then
    raise exception 'Firm ownership and identity cannot be edited.';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then raise exception 'Choose a valid time zone.'; end if;
  if jsonb_typeof(new.business_hours) <> 'array' then raise exception 'Business hours must be an array.'; end if;
  if jsonb_array_length(new.business_hours) not between 1 and 7 then raise exception 'Choose between one and seven open days.'; end if;
  for v_hour in select value from jsonb_array_elements(new.business_hours) loop
    if jsonb_typeof(v_hour) <> 'object' or coalesce(v_hour->>'day', '') !~ '^[1-7]$'
      or coalesce(v_hour->>'start', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(v_hour->>'end', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Check the business hours for each day.'; end if;
    v_day := (v_hour->>'day')::integer;
    if v_day = any(v_days) or (v_hour->>'start') >= (v_hour->>'end') then raise exception 'Open days must be unique, and closing time must follow opening time.'; end if;
    v_days := array_append(v_days, v_day);
  end loop;
  new.updated_at := now();
  return new;
end;
$$;
create trigger validate_firm_settings before insert or update on public.firms for each row execute function public.validate_firm_settings();

-- Materialize inherited availability; custom matter rules always take priority.
create function public.refresh_firm_availability(p_firm_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_firm public.firms; v_matter record;
begin
  select * into v_firm from public.firms where id = p_firm_id;
  for v_matter in select id from public.matters where firm_id = p_firm_id loop
    delete from public.calendar_availability_rules where matter_id = v_matter.id and firm_default;
    if not exists (select 1 from public.calendar_availability_rules where matter_id = v_matter.id and not firm_default and is_active) then
      insert into public.calendar_availability_rules(matter_id, weekday, start_time, end_time, timezone, label, is_active, created_by, firm_default)
      select v_matter.id, (hour->>'day')::integer, (hour->>'start')::time, (hour->>'end')::time, v_firm.timezone, 'Firm business hours', true, v_firm.created_by, true
      from jsonb_array_elements(v_firm.business_hours) hour;
    end if;
  end loop;
end;
$$;
revoke all on function public.refresh_firm_availability(uuid) from public, anon, authenticated;
create function public.refresh_firm_availability_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.refresh_firm_availability(new.id); return new; end;
$$;
create trigger refresh_firm_availability after update of timezone, business_hours on public.firms for each row execute function public.refresh_firm_availability_trigger();

create function public.preserve_matter_availability_override() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then new.firm_default := false; end if;
  return new;
end;
$$;
create trigger preserve_matter_availability_override before insert or update on public.calendar_availability_rules for each row execute function public.preserve_matter_availability_override();

create function public.remove_inherited_availability_on_override() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.firm_default and new.is_active then
    delete from public.calendar_availability_rules where matter_id = new.matter_id and firm_default and id <> new.id;
  end if;
  return new;
end;
$$;
create trigger remove_inherited_availability_on_override after insert or update on public.calendar_availability_rules for each row execute function public.remove_inherited_availability_on_override();

create function public.connect_firm_matters(p_firm_id uuid, p_matter_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_existing uuid;
begin
  if auth.uid() is null or not public.is_firm_admin(p_firm_id) then raise exception 'Only a firm administrator can connect existing matters.' using errcode = '42501'; end if;
  if coalesce(cardinality(p_matter_ids), 0) > 50 then raise exception 'Connect at most 50 matters at once.'; end if;
  foreach v_id in array coalesce(p_matter_ids, '{}'::uuid[]) loop
    if not public.has_matter_role(v_id, array['attorney', 'admin']) then raise exception 'You must manage every selected matter.' using errcode = '42501'; end if;
    select firm_id into v_existing from public.matters where id = v_id for update;
    if v_existing is not null and v_existing <> p_firm_id then raise exception 'A selected matter already belongs to another firm.'; end if;
    update public.matters set firm_id = p_firm_id, updated_at = now() where id = v_id;
    perform public.log_audit_event(v_id, 'matter', v_id, 'update', 'Connected matter to shared firm settings', null, jsonb_build_object('firm_id', p_firm_id));
  end loop;
  perform public.refresh_firm_availability(p_firm_id);
end;
$$;
revoke all on function public.connect_firm_matters(uuid, uuid[]) from public, anon;
grant execute on function public.connect_firm_matters(uuid, uuid[]) to authenticated;

create function public.create_firm(p_settings jsonb, p_matter_ids uuid[] default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to create a firm.' using errcode = '42501'; end if;
  insert into public.firms(name, contact_email, contact_phone, website, address, timezone, jurisdiction, brand_color, document_footer, business_hours, created_by)
  values (p_settings->>'name', coalesce(p_settings->>'contact_email', ''), coalesce(p_settings->>'contact_phone', ''), coalesce(p_settings->>'website', ''), coalesce(p_settings->>'address', ''), coalesce(p_settings->>'timezone', 'America/Chicago'), coalesce(p_settings->>'jurisdiction', ''), coalesce(p_settings->>'brand_color', '#b65f3a'), coalesce(p_settings->>'document_footer', ''), coalesce(p_settings->'business_hours', '[{"day":1,"start":"09:00","end":"17:00"},{"day":2,"start":"09:00","end":"17:00"},{"day":3,"start":"09:00","end":"17:00"},{"day":4,"start":"09:00","end":"17:00"},{"day":5,"start":"09:00","end":"17:00"}]'), auth.uid()) returning id into v_id;
  insert into public.firm_members(firm_id, user_id, role) values(v_id, auth.uid(), 'admin');
  perform public.connect_firm_matters(v_id, p_matter_ids);
  return v_id;
end;
$$;
revoke all on function public.create_firm(jsonb, uuid[]) from public, anon;
grant execute on function public.create_firm(jsonb, uuid[]) to authenticated;

create function public.create_firm_matter(p_firm_id uuid, p_matter_number text, p_name text, p_case_mode text, p_jurisdiction text default null, p_venue text default null) returns public.matters
language plpgsql security definer set search_path = '' as $$
declare v_matter public.matters; v_jurisdiction text;
begin
  if auth.uid() is null or not public.is_firm_admin(p_firm_id) then raise exception 'Only a firm administrator can create matters in this workspace.' using errcode = '42501'; end if;
  select jurisdiction into v_jurisdiction from public.firms where id = p_firm_id;
  select * into v_matter from public.create_matter(p_matter_number, p_name, p_case_mode, coalesce(nullif(trim(p_jurisdiction), ''), nullif(v_jurisdiction, '')), p_venue);
  perform public.connect_firm_matters(p_firm_id, array[v_matter.id]);
  select * into v_matter from public.matters where id = v_matter.id;
  return v_matter;
end;
$$;
revoke all on function public.create_firm_matter(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.create_firm_matter(uuid, text, text, text, text, text) to authenticated;

create function public.guard_matter_firm_assignment() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and ((tg_op = 'INSERT' and new.firm_id is not null) or (tg_op = 'UPDATE' and new.firm_id is distinct from old.firm_id)) then
    raise exception 'Use the firm settings screen to connect a matter.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger guard_matter_firm_assignment before insert or update of firm_id on public.matters for each row execute function public.guard_matter_firm_assignment();

-- Only public business identity is exposed, and only through an active booking
-- page or a valid, unexpired preparation token. Never return staff or matter IDs.
create function public.get_public_firm_identity(p_booking_slug text default null, p_packet_token text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', f.name, 'contact_email', f.contact_email, 'contact_phone', f.contact_phone, 'website', f.website, 'address', f.address, 'timezone', f.timezone, 'brand_color', f.brand_color, 'document_footer', f.document_footer)
  from public.firms f join public.matters m on m.firm_id = f.id
  where (p_booking_slug is not null and p_packet_token is null and exists (select 1 from public.booking_pages b where b.matter_id = m.id and b.slug = lower(trim(p_booking_slug)) and b.active))
     or (p_packet_token is not null and p_booking_slug is null and exists (select 1 from public.appointment_packets p where p.matter_id = m.id and p.token = p_packet_token and p.status = 'active' and p.expires_at > now()))
  limit 1;
$$;
revoke all on function public.get_public_firm_identity(text, text) from public;
grant execute on function public.get_public_firm_identity(text, text) to anon, authenticated;
