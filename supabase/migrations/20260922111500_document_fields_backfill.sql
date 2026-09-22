-- Backfill structured fields for drafts that existed before the field-schema migration.

update public.appointment_document_drafts
set field_schema = case template_key
  when 'intake_questionnaire' then '[
    {"key":"full_name","label":"Full legal name","type":"text","required":true,"clientEditable":true},
    {"key":"preferred_name","label":"Preferred name and pronouns","type":"text","clientEditable":true},
    {"key":"phone","label":"Best phone number","type":"text","clientEditable":true},
    {"key":"email","label":"Best email address","type":"email","required":true,"clientEditable":true},
    {"key":"matter_overview","label":"What happened?","type":"textarea","clientEditable":true},
    {"key":"desired_outcome","label":"What outcome are you seeking?","type":"textarea","clientEditable":true},
    {"key":"deadlines","label":"Deadlines, hearings, or urgent concerns","type":"textarea","clientEditable":true},
    {"key":"key_people","label":"Key people and entities","type":"textarea","clientEditable":true},
    {"key":"key_documents","label":"Key documents and evidence","type":"textarea","clientEditable":true},
    {"key":"prior_proceedings","label":"Prior advice or proceedings","type":"textarea","clientEditable":true}
  ]'::jsonb
  when 'engagement_letter' then '[
    {"key":"scope","label":"Scope of representation","type":"textarea","required":true,"clientEditable":true},
    {"key":"fee_arrangement","label":"Fee arrangement","type":"text","required":true,"clientEditable":true},
    {"key":"initial_retainer","label":"Initial deposit or retainer","type":"text","clientEditable":true},
    {"key":"billing_terms","label":"Billing frequency and payment method","type":"text","clientEditable":true}
  ]'::jsonb
  else field_schema
end
where field_schema = '[]'::jsonb
  and template_key in ('intake_questionnaire', 'engagement_letter');

insert into public.appointment_document_signatures (
  matter_id, appointment_document_id, signer_role, status, signer_email, created_by
)
select
  draft.matter_id,
  draft.appointment_document_id,
  'client',
  'requested',
  appointment.client_email,
  draft.created_by
from public.appointment_document_drafts draft
join public.appointment_documents document
  on document.matter_id = draft.matter_id
 and document.id = draft.appointment_document_id
join public.appointments appointment
  on appointment.matter_id = document.matter_id
 and appointment.id = document.appointment_id
where draft.template_key = 'engagement_letter'
  and draft.status = 'final'
  and draft.visibility = 'client'
on conflict (matter_id, appointment_document_id, signer_role) do nothing;
