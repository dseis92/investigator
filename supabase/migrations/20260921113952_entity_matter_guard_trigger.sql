-- Phase 1 security remediation, Step 2 (continued): review_decisions.entity_id
-- and audit_events.entity_id are polymorphic pointers — their target table
-- depends on entity_type — so no single composite foreign key can express
-- "this entity belongs to this matter". Enforce it with a trigger instead.

create function public.resolve_entity_matter_id(p_entity_type text, p_entity_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_matter_id uuid;
begin
  case p_entity_type
    when 'matter' then
      select id into v_matter_id from public.matters where id = p_entity_id;
    when 'matter_member' then
      select matter_id into v_matter_id from public.matter_members where id = p_entity_id;
    when 'question' then
      select matter_id into v_matter_id from public.questions where id = p_entity_id;
    when 'proposition' then
      select matter_id into v_matter_id from public.propositions where id = p_entity_id;
    when 'subject' then
      select matter_id into v_matter_id from public.subjects where id = p_entity_id;
    when 'entity_attribute' then
      select matter_id into v_matter_id from public.entity_attributes where id = p_entity_id;
    when 'lead' then
      select matter_id into v_matter_id from public.leads where id = p_entity_id;
    when 'source' then
      select matter_id into v_matter_id from public.sources where id = p_entity_id;
    when 'evidence' then
      select matter_id into v_matter_id from public.evidence where id = p_entity_id;
    when 'evidence_link' then
      select matter_id into v_matter_id from public.evidence_links where id = p_entity_id;
    when 'event' then
      select matter_id into v_matter_id from public.events where id = p_entity_id;
    when 'statement' then
      select matter_id into v_matter_id from public.statements where id = p_entity_id;
    when 'contradiction' then
      select matter_id into v_matter_id from public.contradictions where id = p_entity_id;
    when 'analysis' then
      select matter_id into v_matter_id from public.analyses where id = p_entity_id;
    when 'analysis_conclusion' then
      select matter_id into v_matter_id from public.analysis_conclusions where id = p_entity_id;
    when 'report' then
      select matter_id into v_matter_id from public.reports where id = p_entity_id;
    when 'review_decision' then
      select matter_id into v_matter_id from public.review_decisions where id = p_entity_id;
    else
      v_matter_id := null;
  end case;

  return v_matter_id;
end;
$$;

revoke all on function public.resolve_entity_matter_id(text, uuid) from public;
grant execute on function public.resolve_entity_matter_id(text, uuid) to authenticated;

create function public.enforce_entity_matter_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_matter_id uuid;
begin
  v_owner_matter_id := public.resolve_entity_matter_id(new.entity_type, new.entity_id);

  if v_owner_matter_id is null then
    raise exception 'Referenced % % does not exist', new.entity_type, new.entity_id
      using errcode = '23503';
  end if;

  if v_owner_matter_id <> new.matter_id then
    raise exception 'Referenced % belongs to a different matter than this %', new.entity_type, tg_table_name
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger review_decisions_entity_matter_guard
  before insert or update on public.review_decisions
  for each row execute function public.enforce_entity_matter_match();

create trigger audit_events_entity_matter_guard
  before insert or update on public.audit_events
  for each row execute function public.enforce_entity_matter_match();
