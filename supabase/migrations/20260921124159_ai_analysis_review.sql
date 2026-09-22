-- Phase 2B: AI-assisted analysis drafts.
--
-- analyses already had generated_by/ai_model/ai_prompt_ref columns from the
-- original schema, built in anticipation of exactly this feature, plus a
-- status column that only allowed 'draft' | 'under_review' | 'final' |
-- 'superseded' — no way to record an explicit rejection distinct from a
-- draft nobody has acted on yet. Add 'rejected'.
--
-- Then close the same class of gap fixed for evidence exclusion in Phase 1:
-- finalizing or rejecting an analysis is the moment an AI-authored draft
-- (or a human one) becomes citable in a report, or is explicitly discarded.
-- That transition must require the same attorney/admin/investigator roles
-- as evidence exclusion, enforced at the database boundary, not only by the
-- UI. Ordinary drafting/editing (draft, under_review) stays open to any
-- matter member, matching how evidence review_state works.

alter table public.analyses drop constraint analyses_status_check;
alter table public.analyses add constraint analyses_status_check
  check (status in ('draft', 'under_review', 'final', 'rejected', 'superseded'));

create function public.enforce_analysis_finalization_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('final', 'rejected') and old.status not in ('final', 'rejected') then
    if not public.has_matter_role(new.matter_id, array['attorney', 'admin', 'investigator']) then
      raise exception 'Your role does not permit finalizing or rejecting an analysis' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_analysis_finalization_role() from public, anon, authenticated;

create trigger analysis_finalization_role_guard
  before update on public.analyses
  for each row execute function public.enforce_analysis_finalization_role();
