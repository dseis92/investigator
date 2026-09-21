-- Phase 1 security remediation, follow-up: the automated test suite caught
-- that `revoke all on function ... from public` was NOT sufficient to stop
-- the anon role from calling is_matter_member() — Supabase's project
-- bootstrap grants EXECUTE on newly created public-schema functions
-- directly to anon/authenticated/service_role via ALTER DEFAULT PRIVILEGES,
-- not through the PUBLIC pseudo-role, so revoking from PUBLIC alone leaves
-- those direct grants untouched. Revoke from anon explicitly everywhere a
-- privileged function should be authenticated-only.

revoke execute on function public.is_matter_member(uuid) from anon;
revoke execute on function public.has_matter_role(uuid, text[]) from anon;
revoke execute on function public.create_matter(text, text, text, text, text) from anon;
revoke execute on function public.log_audit_event(uuid, text, uuid, text, text, jsonb, jsonb) from anon;
revoke execute on function public.log_review_decision(uuid, text, uuid, text, text) from anon;
revoke execute on function public.resolve_entity_matter_id(text, uuid) from anon;
revoke execute on function public.enforce_entity_matter_match() from public, anon, authenticated;
revoke execute on function public.enforce_evidence_exclusion_role() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
