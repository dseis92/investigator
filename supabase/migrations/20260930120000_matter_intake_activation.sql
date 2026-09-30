-- Matter intake remains distinct from legacy matter.status = 'active'.
alter table public.matters
  add column conflict_reviewed_at timestamptz,
  add column intake_activated_at timestamptz;

create function public.manage_matter_intake(p_matter_id uuid, p_operation text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_matter public.matters;
  v_title text;
begin
  if auth.uid() is null or not public.has_matter_role(p_matter_id, array['attorney', 'admin']) then
    raise exception 'An attorney or administrator must manage intake review.' using errcode = '42501';
  end if;
  select * into v_matter from public.matters where id = p_matter_id for update;
  if not found then raise exception 'Matter unavailable'; end if;
  if p_operation = 'review_conflicts' then
    if v_matter.conflict_status not in ('clear', 'waived') or nullif(trim(v_matter.client_name), '') is null then
      raise exception 'Record a clear or waived conflict decision and a client name first.';
    end if;
    if nullif(trim(p_note), '') is null then raise exception 'Add a conflict review note.'; end if;
    update public.matters set conflict_reviewed_at = now(), conflict_note = trim(p_note), updated_at = now() where id = p_matter_id;
  elsif p_operation = 'prepare' then
    foreach v_title in array array['Obtain completed intake questionnaire', 'Obtain signed engagement letter', 'Review completed intake questionnaire', 'Review signed engagement letter'] loop
      insert into public.matter_onboarding_items (matter_id, item_type, title, is_required, created_by)
      select p_matter_id, 'task', v_title, v_title like 'Review%', auth.uid()
      where not exists (select 1 from public.matter_onboarding_items where matter_id = p_matter_id and title = v_title);
    end loop;
  elsif p_operation = 'activate' then
    perform 1 from public.appointment_documents where matter_id = p_matter_id for update;
    perform 1 from public.appointment_document_drafts where matter_id = p_matter_id for update;
    perform 1 from public.appointment_document_signatures where matter_id = p_matter_id for update;
    perform 1 from public.matter_onboarding_items where matter_id = p_matter_id for update;
    if v_matter.intake_activated_at is not null then return jsonb_build_object('ok', true); end if;
    if v_matter.status in ('closed', 'archived') then raise exception 'Closed or archived matters cannot be activated here.'; end if;
    if nullif(trim(v_matter.client_name), '') is null or v_matter.conflict_reviewed_at is null or v_matter.conflict_status not in ('clear', 'waived') then
      raise exception 'Client identity and attorney conflict review are required.';
    end if;
    -- Use the newest document of each type, as displayed by the matter workflow.
    if not exists (
      select 1 from public.appointment_documents d
      join public.appointment_document_drafts draft on draft.appointment_document_id = d.id and draft.matter_id = d.matter_id
      where d.id = (select id from public.appointment_documents where matter_id = p_matter_id and name = 'Intake questionnaire' order by created_at desc, id desc limit 1)
        and d.status = 'received' and draft.status = 'final'
    ) then raise exception 'Complete and approve the intake questionnaire.'; end if;
    if not exists (
      select 1 from public.appointment_documents d
      join public.appointment_document_drafts draft on draft.appointment_document_id = d.id and draft.matter_id = d.matter_id
      join public.appointment_document_signatures s on s.appointment_document_id = d.id and s.matter_id = d.matter_id
      where d.id = (select id from public.appointment_documents where matter_id = p_matter_id and name = 'Engagement letter' order by created_at desc, id desc limit 1)
        and d.status = 'signed' and draft.status = 'final' and s.status = 'signed' and s.signer_role = 'client'
        and s.signed_version_id = (select id from public.appointment_document_versions where appointment_document_id = d.id and matter_id = p_matter_id order by version_number desc limit 1)
    ) then raise exception 'A client signature on the current engagement letter version is required.'; end if;
    foreach v_title in array array['Review completed intake questionnaire', 'Review signed engagement letter'] loop
      if not exists (select 1 from public.matter_onboarding_items where matter_id = p_matter_id and title = v_title and status = 'completed') then
        raise exception 'Complete the document review tasks before activation.';
      end if;
    end loop;
    if exists (select 1 from public.matter_onboarding_items where matter_id = p_matter_id and is_required and status = 'open') then
      raise exception 'Complete or waive the remaining required setup items.';
    end if;
    update public.matters set status = 'active', engagement_status = 'signed', intake_activated_at = now(), updated_at = now() where id = p_matter_id;
  else raise exception 'Unknown intake operation'; end if;
  perform public.log_audit_event(p_matter_id, 'matter', p_matter_id, 'update', 'Intake workflow: ' || p_operation, null, jsonb_build_object('operation', p_operation));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.manage_matter_intake(uuid, text, text) from public, anon;
grant execute on function public.manage_matter_intake(uuid, text, text) to authenticated;

-- A changed client or conflict posture invalidates the prior conflict review.
create function public.invalidate_matter_conflict_review()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and (
    new.conflict_reviewed_at is distinct from old.conflict_reviewed_at or
    new.intake_activated_at is distinct from old.intake_activated_at
  ) then
    raise exception 'Use the intake review workflow to change review or activation dates.' using errcode = '42501';
  end if;
  if new.client_name is distinct from old.client_name or new.conflict_status is distinct from old.conflict_status
     or (current_user in ('authenticated', 'anon') and new.conflict_note is distinct from old.conflict_note) then
    new.conflict_reviewed_at := null;
  end if;
  return new;
end;
$$;
create trigger invalidate_matter_conflict_review before update on public.matters
for each row execute function public.invalidate_matter_conflict_review();

create function public.guard_intake_review_tasks()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.title in ('Review completed intake questionnaire', 'Review signed engagement letter')
     or (tg_op = 'UPDATE' and old.title in ('Review completed intake questionnaire', 'Review signed engagement letter')) then
    if not public.has_matter_role(new.matter_id, array['attorney', 'admin']) then
      raise exception 'An attorney or administrator must record document review.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_intake_review_tasks before insert or update on public.matter_onboarding_items
for each row execute function public.guard_intake_review_tasks();
