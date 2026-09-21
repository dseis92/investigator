import type { Database } from "@/lib/supabase/types"

type Tables = Database["public"]["Tables"]

export type Profile = Tables["profiles"]["Row"]
export type Matter = Tables["matters"]["Row"]
export type MatterMember = Tables["matter_members"]["Row"]
export type Question = Tables["questions"]["Row"]
export type Proposition = Tables["propositions"]["Row"]
export type Subject = Tables["subjects"]["Row"]
export type Lead = Tables["leads"]["Row"]
export type Source = Tables["sources"]["Row"]
export type Evidence = Tables["evidence"]["Row"]
export type EvidenceAnnotation = Tables["evidence_annotations"]["Row"]
export type EntityAttribute = Tables["entity_attributes"]["Row"]
export type EventRow = Tables["events"]["Row"]
export type Statement = Tables["statements"]["Row"]
export type EvidenceLink = Tables["evidence_links"]["Row"]
export type Contradiction = Tables["contradictions"]["Row"]
export type ContradictionEvidence = Tables["contradiction_evidence"]["Row"]
export type ContradictionReview = Tables["contradiction_reviews"]["Row"]
export type Analysis = Tables["analyses"]["Row"]
export type AnalysisConclusion = Tables["analysis_conclusions"]["Row"]
export type AnalysisConclusionEvidence = Tables["analysis_conclusion_evidence"]["Row"]
export type Report = Tables["reports"]["Row"]
export type ReviewDecision = Tables["review_decisions"]["Row"]
export type AuditEvent = Tables["audit_events"]["Row"]

export const MATTER_ROLES = [
  "attorney",
  "investigator",
  "paralegal",
  "litigation_support",
  "expert",
  "admin",
] as const
export type MatterRole = (typeof MATTER_ROLES)[number]

/** Shared uncertainty vocabulary reused across attributes, evidence, statements, and events. */
export const UNCERTAINTY_STATUSES = [
  "verified",
  "reported",
  "inferred",
  "disputed",
  "unknown",
  "superseded",
] as const
export type UncertaintyStatus = (typeof UNCERTAINTY_STATUSES)[number]

export const ANALYSIS_CLASSIFICATIONS = [
  "verified_fact",
  "source_reported_assertion",
  "analyst_inference",
  "hypothesis",
  "disputed",
  "unknown",
] as const
export type AnalysisClassification = (typeof ANALYSIS_CLASSIFICATIONS)[number]

export const SUBJECT_TYPES = [
  "person",
  "business",
  "organization",
  "account",
  "address",
  "document",
  "witness",
  "expert",
  "event",
  "case",
] as const
export type SubjectType = (typeof SUBJECT_TYPES)[number]

export const EVIDENCE_ARTIFACT_TYPES = [
  "document",
  "photo",
  "video",
  "audio",
  "communication",
  "physical",
  "digital_forensic",
  "testimony",
  "public_record",
  "other",
] as const

export const AUTHENTICATION_STATUSES = [
  "authenticated",
  "stipulated",
  "disputed",
  "unauthenticated",
  "not_applicable",
] as const

export const IDENTITY_MATCH_STATUSES = ["confirmed", "probable", "possible", "unresolved", "excluded"] as const

export const REVIEW_STATES = ["new", "under_review", "reviewed", "flagged", "excluded"] as const

export const RELATIONSHIP_TYPES = [
  "supports",
  "contradicts",
  "mentions",
  "authenticates",
  "establishes_provenance",
  "other",
] as const

export const SOURCE_TYPES = [
  "public_record",
  "court_filing",
  "law_enforcement_report",
  "witness_interview",
  "business_record",
  "digital_forensics",
  "social_media",
  "media_report",
  "expert_report",
  "other",
] as const
