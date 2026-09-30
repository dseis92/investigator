-- Reviews must cover the current draft, not an earlier document revision.
create function public.require_current_intake_document_review()
returns trigger language plpgsql set search_path = '' as $$
declare v_name text;
begin
  if new.intake_activated_at is not null and old.intake_activated_at is null then
    foreach v_name in array array['Intake questionnaire', 'Engagement letter'] loop
      if not exists (
        select 1 from public.matter_onboarding_items item
        join public.appointment_document_drafts draft on draft.matter_id = item.matter_id
        where item.matter_id = new.id
          and item.title = case when v_name = 'Intake questionnaire' then 'Review completed intake questionnaire' else 'Review signed engagement letter' end
          and item.status = 'completed' and item.updated_at >= draft.updated_at
          and draft.appointment_document_id = (select id from public.appointment_documents where matter_id = new.id and name = v_name order by created_at desc, id desc limit 1)
      ) then raise exception 'Record attorney review of the current % before activation.', v_name; end if;
    end loop;
  end if;
  return new;
end;
$$;
create trigger require_current_intake_document_review before update of intake_activated_at on public.matters
for each row execute function public.require_current_intake_document_review();
