import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { recordReportGenerated } from "./actions"
import { MatterHeader } from "@/components/matters/matter-header"
import { PrintButton } from "@/components/reports/print-button"
import {
  WitnessContradictionReport,
  type ReportEvidenceRef,
  type WitnessContradictionEntry,
  type WitnessReportEntry,
  type WitnessStatementEntry,
} from "@/components/reports/witness-contradiction-report"
import { formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Witness Contradiction Report" }

type EvidenceJoin = {
  id: string
  evidence_number: string
  title: string
  source_locator: string | null
  event_date: string | null
  provenance_status: string
}

export default async function WitnessContradictionReportPage({
  params,
}: {
  params: Promise<{ matterId: string }>
}) {
  const { matterId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const [
    { data: witnessSubjects },
    { data: statements },
    { data: statementLinks },
    { data: contradictions },
    { data: reviews },
    { data: contradictionEvidence },
  ] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, display_name, subject_type, summary")
      .eq("matter_id", matterId)
      .in("subject_type", ["witness", "expert"])
      .order("display_name", { ascending: true }),
    supabase
      .from("statements")
      .select(
        "id, subject_id, content, statement_date, status, evidence:evidence!statements_evidence_matter_fkey(id, evidence_number, title, source_locator, event_date, provenance_status)"
      )
      .eq("matter_id", matterId)
      .order("statement_date", { ascending: true }),
    supabase
      .from("evidence_links")
      .select(
        "statement_id, relationship, evidence:evidence!evidence_links_evidence_matter_fkey(id, evidence_number, title, source_locator, event_date, provenance_status)"
      )
      .eq("matter_id", matterId)
      .not("statement_id", "is", null),
    supabase
      .from("contradictions")
      .select(
        "id, title, conflict_type, side_a_label, side_a_summary, side_b_label, side_b_summary, statement_a_id, statement_b_id, resolution_status, plausible_alternative_explanations, missing_evidence"
      )
      .eq("matter_id", matterId),
    supabase.from("contradiction_reviews").select("*").eq("matter_id", matterId),
    supabase
      .from("contradiction_evidence")
      .select(
        "contradiction_id, side, evidence:evidence!contradiction_evidence_evidence_matter_fkey(id, evidence_number, title, source_locator, event_date, provenance_status)"
      )
      .eq("matter_id", matterId),
  ])

  // --- Build lookup maps -------------------------------------------------

  const statementSubject = new Map<string, string>()
  for (const s of statements ?? []) statementSubject.set(s.id, s.subject_id ?? "")

  const linksByStatement = new Map<string, { supports: ReportEvidenceRef[]; contradicts: ReportEvidenceRef[] }>()
  for (const link of statementLinks ?? []) {
    if (!link.statement_id || !link.evidence) continue
    const bucket = linksByStatement.get(link.statement_id) ?? { supports: [], contradicts: [] }
    const ref = link.evidence as unknown as EvidenceJoin
    if (link.relationship === "supports") bucket.supports.push(ref)
    else if (link.relationship === "contradicts") bucket.contradicts.push(ref)
    linksByStatement.set(link.statement_id, bucket)
  }

  const reviewByContradiction = new Map((reviews ?? []).map((r) => [r.contradiction_id, r]))

  const evidenceByContradiction = new Map<string, { a: ReportEvidenceRef[]; b: ReportEvidenceRef[] }>()
  for (const ce of contradictionEvidence ?? []) {
    if (!ce.evidence) continue
    const bucket = evidenceByContradiction.get(ce.contradiction_id) ?? { a: [], b: [] }
    const ref = ce.evidence as unknown as EvidenceJoin
    if (ce.side === "a") bucket.a.push(ref)
    else bucket.b.push(ref)
    evidenceByContradiction.set(ce.contradiction_id, bucket)
  }

  const statementsBySubject = new Map<string, WitnessStatementEntry[]>()
  for (const s of statements ?? []) {
    if (!s.subject_id || !s.evidence) continue
    const links = linksByStatement.get(s.id) ?? { supports: [], contradicts: [] }
    const entry: WitnessStatementEntry = {
      id: s.id,
      content: s.content,
      statementDate: s.statement_date,
      status: s.status,
      sourceEvidence: s.evidence as unknown as EvidenceJoin,
      corroborating: links.supports,
      contradicting: links.contradicts,
    }
    const list = statementsBySubject.get(s.subject_id) ?? []
    list.push(entry)
    statementsBySubject.set(s.subject_id, list)
  }

  function deriveUnresolvedQuestions(review: NonNullable<typeof reviews>[number] | undefined): string[] {
    if (!review) return []
    const questions: string[] = []
    if (review.correlation_vs_causation) {
      questions.push(`Whether correlation is being treated as causation: ${review.correlation_vs_causation}`)
    }
    if (review.absence_of_evidence_check) {
      questions.push(`Whether absence of evidence is being treated as evidence of absence: ${review.absence_of_evidence_check}`)
    }
    if (review.evidence_against_theory) {
      questions.push(`Evidence cutting against the current account: ${review.evidence_against_theory}`)
    }
    return questions
  }

  function deriveExaminationTopics(
    contradiction: NonNullable<typeof contradictions>[number],
    review: NonNullable<typeof reviews>[number] | undefined
  ): string[] {
    const topics: string[] = [`Circumstances surrounding: ${contradiction.title}`]
    if (review?.weakest_assumption) topics.push(`Basis for: ${review.weakest_assumption}`)
    if (review?.opposing_counsel_attack) topics.push(review.opposing_counsel_attack)
    if (review?.fact_that_would_weaken_conclusion) {
      topics.push(`Awareness of: ${review.fact_that_would_weaken_conclusion}`)
    }
    return topics
  }

  const witnesses: WitnessReportEntry[] = (witnessSubjects ?? [])
    .map((witness): WitnessReportEntry => {
      const ownStatements = statementsBySubject.get(witness.id) ?? []

      const relevantContradictions: WitnessContradictionEntry[] = (contradictions ?? [])
        .filter((c) => {
          const subjectA = c.statement_a_id ? statementSubject.get(c.statement_a_id) : null
          const subjectB = c.statement_b_id ? statementSubject.get(c.statement_b_id) : null
          return subjectA === witness.id || subjectB === witness.id
        })
        .map((c): WitnessContradictionEntry => {
          const subjectA = c.statement_a_id ? statementSubject.get(c.statement_a_id) : null
          const ownSide: "a" | "b" = subjectA === witness.id ? "a" : "b"
          const otherSide: "a" | "b" = ownSide === "a" ? "b" : "a"
          const review = reviewByContradiction.get(c.id)
          const evidenceSides = evidenceByContradiction.get(c.id) ?? { a: [], b: [] }
          const isUnresolved = c.resolution_status !== "resolved_a" && c.resolution_status !== "resolved_b"

          return {
            id: c.id,
            title: c.title,
            conflictType: c.conflict_type,
            ownLabel: ownSide === "a" ? c.side_a_label : c.side_b_label,
            ownSummary: ownSide === "a" ? c.side_a_summary : c.side_b_summary,
            otherLabel: otherSide === "a" ? c.side_a_label : c.side_b_label,
            otherSummary: otherSide === "a" ? c.side_a_summary : c.side_b_summary,
            resolutionStatus: c.resolution_status,
            plausibleAlternativeExplanations: c.plausible_alternative_explanations,
            missingEvidence: c.missing_evidence,
            ownSideEvidence: evidenceSides[ownSide],
            otherSideEvidence: evidenceSides[otherSide],
            unresolvedCredibilityQuestions: isUnresolved ? deriveUnresolvedQuestions(review) : [],
            examinationTopics: deriveExaminationTopics(c, review),
          }
        })

      return {
        subjectId: witness.id,
        displayName: witness.display_name,
        subjectType: witness.subject_type,
        summary: witness.summary,
        statements: ownStatements,
        contradictions: relevantContradictions,
      }
    })
    .filter((w) => w.statements.length > 0 || w.contradictions.length > 0)

  const generatedAt = formatDate(new Date().toISOString())

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Witness Contradiction Report" />

      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Every witness and expert with recorded statements, materially different descriptions identified between
          accounts, and cited evidence for each side.
        </p>
        <PrintButton onBeforePrint={recordReportGenerated.bind(null, matterId)} />
      </div>

      <div className="hidden print:block">
        <h1 className="text-lg font-semibold">Witness Contradiction Report — {matter.name}</h1>
        <p className="text-xs text-muted-foreground">
          {matter.matter_number} · Generated {generatedAt}
        </p>
      </div>

      {witnesses.length > 0 ? (
        <WitnessContradictionReport matterId={matterId} witnesses={witnesses} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No witness or expert subjects with recorded statements exist for this matter yet. Add subjects typed
          Witness or Expert and record their statements first.
        </p>
      )}

      <p className="text-xs text-muted-foreground print:mt-4">
        Limitations: this report reflects only statements, contradictions, and evidence links recorded in TraceLine
        as of the generation time above. Unresolved questions and examination topics are drawn directly from the
        adversarial review already recorded for each contradiction — none are auto-generated conclusions about a
        witness&apos;s honesty or reliability. Provenance badges reflect the status recorded on the evidence item, not
        courtroom authentication.
      </p>
    </div>
  )
}
