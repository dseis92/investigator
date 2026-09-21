-- Phase 1 security remediation, Step 4: privileged functions and roles.
--
-- Findings addressed:
-- 1. create_matter() accepted a client-supplied p_role with no validation —
--    a direct RPC call could pass p_role => 'admin' (or anything satisfying
--    matter_members' role CHECK) and self-assign it on the matter being
--    created. The creator's role must always be 'attorney', not
--    client-chosen.
-- 2. create_matter() relied on the NOT NULL constraint on matters.created_by
--    to incidentally reject unauthenticated callers (auth.uid() is null ->
--    insert fails). That's not an explicit guard; make it one.
-- 3. is_matter_member(), has_matter_role(), and create_matter() were all
--    executable by PUBLIC (Postgres' default EXECUTE grant on new
--    functions), which in Supabase includes the anon role. None of them
--    leak data to anon (they only ever return a boolean, or fail on a null
--    auth.uid()), but "anonymous callers can invoke this at all" is exactly
--    the kind of accidental over-grant this step exists to close.
-- 4. The evidence table's single UPDATE policy let ANY matter member —
--    including read-oriented roles like litigation_support and expert —
--    flip is_excluded / excluded_reason directly via the API, even though
--    the application's own canExcludeEvidence() only allows
--    attorney/admin/investigator to do this through the UI. The database
--    did not agree with the application about who may exclude evidence.

-- ============================================================
-- 1. create_matter(): force role, require auth, restrict execution
-- ============================================================

drop function if exists public.create_matter(text, text, text, text, text, text);

create function public.create_matter(
  p_matter_number text,
  p_name text,
  p_case_mode text,
  p_jurisdiction text default null,
  p_venue text default null
)
returns public.matters
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_matter public.matters;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  insert into public.matters (matter_number, name, case_mode, jurisdiction, venue, created_by)
  values (p_matter_number, p_name, p_case_mode, p_jurisdiction, p_venue, auth.uid())
  returning * into v_matter;

  -- The creator's role is always 'attorney' — never client-supplied. Editing
  -- membership roles afterward still goes through matter_members' own
  -- attorney/admin-gated RLS policies, which are per-matter and were already
  -- correctly scoped.
  insert into public.matter_members (matter_id, user_id, role)
  values (v_matter.id, auth.uid(), 'attorney');

  return v_matter;
end;
$$;

revoke all on function public.create_matter(text, text, text, text, text) from public;
grant execute on function public.create_matter(text, text, text, text, text) to authenticated;

-- ============================================================
-- 2. Restrict execution on the membership-check helpers
-- ============================================================

revoke all on function public.is_matter_member(uuid) from public;
grant execute on function public.is_matter_member(uuid) to authenticated;

revoke all on function public.has_matter_role(uuid, text[]) from public;
grant execute on function public.has_matter_role(uuid, text[]) to authenticated;

-- ============================================================
-- 3. Evidence exclusion is attorney/admin/investigator only, at the
--    database boundary — matching lib/matters/get-role.ts canExcludeEvidence()
-- ============================================================

create function public.enforce_evidence_exclusion_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.is_excluded is distinct from old.is_excluded)
     or (new.excluded_reason is distinct from old.excluded_reason) then
    if not public.has_matter_role(new.matter_id, array['attorney', 'admin', 'investigator']) then
      raise exception 'Your role does not permit excluding or restoring evidence' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger evidence_exclusion_role_guard
  before update on public.evidence
  for each row execute function public.enforce_evidence_exclusion_role();
