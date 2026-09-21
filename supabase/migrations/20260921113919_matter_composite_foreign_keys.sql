-- Phase 1 security remediation, Step 2: cross-matter reference integrity.
--
-- Every matter-owned table already carries its own matter_id, but the
-- original simple foreign keys (e.g. propositions.question_id -> questions.id)
-- only validate that the referenced ROW exists somewhere — not that it
-- belongs to the SAME matter as the referencing row. A caller who knows a
-- UUID belonging to Matter B could attach it to a row they are inserting
-- under Matter A, even though RLS correctly scoped both individual
-- read/write operations to matters the caller belongs to.
--
-- Fix: add a `unique (matter_id, id)` constraint to every matter-owned
-- table that is referenced by another matter-owned table, then add a
-- SECOND, composite foreign key `(matter_id, child_col) references
-- parent(matter_id, id)` alongside each existing simple FK. The composite
-- FK is strictly stronger than the simple one — every legitimate same-matter
-- row already satisfies it, and it rejects any row whose child matter_id
-- does not match the referenced parent's matter_id. The original simple FKs
-- are left in place; there is no need to know their auto-generated names or
-- risk dropping the wrong constraint, since the two are compatible additive
-- constraints, not replacements.
--
-- This does not cover the polymorphic entity_id columns on review_decisions
-- and audit_events (their target table varies by entity_type, so a composite
-- FK cannot express it) — those are handled by trigger in the next
-- migration.

-- ============================================================
-- 1. Parent-side unique(matter_id, id) constraints
-- ============================================================
alter table public.questions add constraint questions_matter_id_id_key unique (matter_id, id);
alter table public.subjects add constraint subjects_matter_id_id_key unique (matter_id, id);
alter table public.sources add constraint sources_matter_id_id_key unique (matter_id, id);
alter table public.evidence add constraint evidence_matter_id_id_key unique (matter_id, id);
alter table public.entity_attributes add constraint entity_attributes_matter_id_id_key unique (matter_id, id);
alter table public.events add constraint events_matter_id_id_key unique (matter_id, id);
alter table public.statements add constraint statements_matter_id_id_key unique (matter_id, id);
alter table public.propositions add constraint propositions_matter_id_id_key unique (matter_id, id);
alter table public.contradictions add constraint contradictions_matter_id_id_key unique (matter_id, id);
alter table public.analyses add constraint analyses_matter_id_id_key unique (matter_id, id);
alter table public.analysis_conclusions add constraint analysis_conclusions_matter_id_id_key unique (matter_id, id);

-- ============================================================
-- 2. Child-side composite foreign keys
-- ============================================================

-- propositions -> questions
alter table public.propositions
  add constraint propositions_question_matter_fkey
  foreign key (matter_id, question_id) references public.questions (matter_id, id) on delete cascade;

-- leads -> subjects / questions (nullable, SET NULL on delete; column-specific
-- so deleting the referenced subject/question never nulls leads.matter_id)
alter table public.leads
  add constraint leads_subject_matter_fkey
  foreign key (matter_id, subject_id) references public.subjects (matter_id, id) on delete set null (subject_id);
alter table public.leads
  add constraint leads_question_matter_fkey
  foreign key (matter_id, question_id) references public.questions (matter_id, id) on delete set null (question_id);

-- evidence -> sources, evidence -> evidence (superseded_by, self-referencing)
alter table public.evidence
  add constraint evidence_source_matter_fkey
  foreign key (matter_id, source_id) references public.sources (matter_id, id);
alter table public.evidence
  add constraint evidence_superseded_by_matter_fkey
  foreign key (matter_id, superseded_by) references public.evidence (matter_id, id);

-- evidence_annotations -> evidence
alter table public.evidence_annotations
  add constraint evidence_annotations_evidence_matter_fkey
  foreign key (matter_id, evidence_id) references public.evidence (matter_id, id) on delete cascade;

-- entity_attributes -> subjects, evidence, entity_attributes (self)
alter table public.entity_attributes
  add constraint entity_attributes_subject_matter_fkey
  foreign key (matter_id, subject_id) references public.subjects (matter_id, id) on delete cascade;
alter table public.entity_attributes
  add constraint entity_attributes_evidence_matter_fkey
  foreign key (matter_id, evidence_id) references public.evidence (matter_id, id);
alter table public.entity_attributes
  add constraint entity_attributes_superseded_by_matter_fkey
  foreign key (matter_id, superseded_by) references public.entity_attributes (matter_id, id);
create index entity_attributes_evidence_id_idx on public.entity_attributes (evidence_id) where evidence_id is not null;

-- events -> evidence (primary_evidence_id)
alter table public.events
  add constraint events_primary_evidence_matter_fkey
  foreign key (matter_id, primary_evidence_id) references public.evidence (matter_id, id);
create index events_primary_evidence_id_idx on public.events (primary_evidence_id) where primary_evidence_id is not null;

-- statements -> subjects, evidence
alter table public.statements
  add constraint statements_subject_matter_fkey
  foreign key (matter_id, subject_id) references public.subjects (matter_id, id);
alter table public.statements
  add constraint statements_evidence_matter_fkey
  foreign key (matter_id, evidence_id) references public.evidence (matter_id, id);
create index statements_evidence_id_idx on public.statements (evidence_id);

-- evidence_links -> evidence (required) and subjects/events/propositions/statements (one-of)
alter table public.evidence_links
  add constraint evidence_links_evidence_matter_fkey
  foreign key (matter_id, evidence_id) references public.evidence (matter_id, id) on delete cascade;
alter table public.evidence_links
  add constraint evidence_links_subject_matter_fkey
  foreign key (matter_id, subject_id) references public.subjects (matter_id, id) on delete cascade;
alter table public.evidence_links
  add constraint evidence_links_event_matter_fkey
  foreign key (matter_id, event_id) references public.events (matter_id, id) on delete cascade;
alter table public.evidence_links
  add constraint evidence_links_proposition_matter_fkey
  foreign key (matter_id, proposition_id) references public.propositions (matter_id, id) on delete cascade;
alter table public.evidence_links
  add constraint evidence_links_statement_matter_fkey
  foreign key (matter_id, statement_id) references public.statements (matter_id, id) on delete cascade;

-- contradictions -> statements / propositions (both sides)
alter table public.contradictions
  add constraint contradictions_statement_a_matter_fkey
  foreign key (matter_id, statement_a_id) references public.statements (matter_id, id);
alter table public.contradictions
  add constraint contradictions_statement_b_matter_fkey
  foreign key (matter_id, statement_b_id) references public.statements (matter_id, id);
alter table public.contradictions
  add constraint contradictions_proposition_a_matter_fkey
  foreign key (matter_id, proposition_a_id) references public.propositions (matter_id, id);
alter table public.contradictions
  add constraint contradictions_proposition_b_matter_fkey
  foreign key (matter_id, proposition_b_id) references public.propositions (matter_id, id);

-- contradiction_evidence -> contradictions, evidence
alter table public.contradiction_evidence
  add constraint contradiction_evidence_contradiction_matter_fkey
  foreign key (matter_id, contradiction_id) references public.contradictions (matter_id, id) on delete cascade;
alter table public.contradiction_evidence
  add constraint contradiction_evidence_evidence_matter_fkey
  foreign key (matter_id, evidence_id) references public.evidence (matter_id, id);

-- contradiction_reviews -> contradictions
alter table public.contradiction_reviews
  add constraint contradiction_reviews_contradiction_matter_fkey
  foreign key (matter_id, contradiction_id) references public.contradictions (matter_id, id) on delete cascade;

-- analyses -> propositions, questions
alter table public.analyses
  add constraint analyses_proposition_matter_fkey
  foreign key (matter_id, proposition_id) references public.propositions (matter_id, id);
alter table public.analyses
  add constraint analyses_question_matter_fkey
  foreign key (matter_id, question_id) references public.questions (matter_id, id);

-- analysis_conclusions -> analyses
alter table public.analysis_conclusions
  add constraint analysis_conclusions_analysis_matter_fkey
  foreign key (matter_id, analysis_id) references public.analyses (matter_id, id) on delete cascade;

-- analysis_conclusion_evidence -> analysis_conclusions, evidence
alter table public.analysis_conclusion_evidence
  add constraint analysis_conclusion_evidence_conclusion_matter_fkey
  foreign key (matter_id, conclusion_id) references public.analysis_conclusions (matter_id, id) on delete cascade;
alter table public.analysis_conclusion_evidence
  add constraint analysis_conclusion_evidence_evidence_matter_fkey
  foreign key (matter_id, evidence_id) references public.evidence (matter_id, id);
