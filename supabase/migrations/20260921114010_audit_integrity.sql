-- Phase 1 security remediation, Step 3: audit integrity.
--
-- Previously, any matter member could INSERT directly into audit_events with
-- an arbitrary actor_id, created_at, action, entity_type/entity_id, and
-- before/after JSON — the RLS policy only checked matter membership, not who
-- the caller actually was or whether the values were truthful. That makes
-- the audit trail forgeable, which defeats its purpose in a litigation
-- product.
--
-- Fix: revoke direct INSERT/UPDATE/DELETE on audit_events from ordinary
-- authenticated clients, and route all audit writes through a narrowly
-- scoped SECURITY DEFINER function that derives actor_id from auth.uid() and
-- created_at from now() — neither is a parameter, so neither can be spoofed.
-- The entity/matter consistency check from the previous migration's trigger
-- still applies to inserts made through this function.
--
-- review_decisions has the same shape of problem (reviewer_id and
-- decision are freely client-suppliable today) — same fix, same migration.

-- ============================================================
-- audit_events: lock down direct writes, add a trusted append function
-- ============================================================

revoke insert, update, delete on public.audit_events from authenticated, anon;
drop policy if exists "audit_events_insert" on public.audit_events;

create function public.log_audit_event(
  p_matter_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_summary text,
  p_previous_value jsonb default null,
  p_new_value jsonb default null
)
returns public.audit_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.audit_events;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_matter_member(p_matter_id) then
    raise exception 'Not a member of this matter' using errcode = '42501';
  end if;

  -- entity_type/action vocabulary is enforced by audit_events' own CHECK
  -- constraints; entity/matter consistency is enforced by the
  -- audit_events_entity_matter_guard trigger fired on the insert below.
  insert into public.audit_events (
    matter_id, actor_id, entity_type, entity_id, action, summary, previous_value, new_value
  ) values (
    p_matter_id, auth.uid(), p_entity_type, p_entity_id, p_action, p_summary, p_previous_value, p_new_value
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.log_audit_event(uuid, text, uuid, text, text, jsonb, jsonb) from public;
grant execute on function public.log_audit_event(uuid, text, uuid, text, text, jsonb, jsonb) to authenticated;

-- ============================================================
-- review_decisions: same problem (reviewer_id is freely client-suppliable),
-- same fix.
-- ============================================================

revoke insert, update, delete on public.review_decisions from authenticated, anon;
drop policy if exists "review_decisions_insert" on public.review_decisions;

create function public.log_review_decision(
  p_matter_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_decision text,
  p_notes text default null
)
returns public.review_decisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.review_decisions;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_matter_member(p_matter_id) then
    raise exception 'Not a member of this matter' using errcode = '42501';
  end if;

  insert into public.review_decisions (
    matter_id, entity_type, entity_id, decision, reviewer_id, notes
  ) values (
    p_matter_id, p_entity_type, p_entity_id, p_decision, auth.uid(), p_notes
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.log_review_decision(uuid, text, uuid, text, text) from public;
grant execute on function public.log_review_decision(uuid, text, uuid, text, text) to authenticated;
