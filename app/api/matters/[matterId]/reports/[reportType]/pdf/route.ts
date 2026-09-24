import { NextResponse } from "next/server"

import type { MatrixRow } from "@/components/reports/proposition-evidence-matrix-table"
import type { ReportEvidenceRef, WitnessContradictionEntry, WitnessReportEntry, WitnessStatementEntry } from "@/components/reports/witness-contradiction-report"
import { getCurrentUser } from "@/lib/auth/get-current-user"
import { formatDate } from "@/lib/format"
import { createPropositionEvidenceMatrixPdf, createWitnessContradictionPdf } from "@/lib/reports/pdf"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type ReportType = "proposition-evidence-matrix" | "witness-contradiction-report"

function isReportType(value: string): value is ReportType {
  return value === "proposition-evidence-matrix" || value === "witness-contradiction-report"
}

function filenamePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "matter"
}

type EvidenceJoin = ReportEvidenceRef & { id: string }

async function buildMatrix(supabase: Awaited<ReturnType<typeof createClient>>, matterId: string) {
  const [{ data: questions }, { data: propositions }, { data: links }] = await Promise.all([
    supabase.from("questions").select("id, prompt").eq("matter_id", matterId),
    supabase.from("propositions").select("id, question_id, statement, status, assumptions, next_action").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("evidence_links").select("proposition_id, relationship, evidence:evidence!evidence_links_evidence_matter_fkey(evidence_number, title, source_locator, event_date, provenance_status)").eq("matter_id", matterId).not("proposition_id", "is", null),
  ])
  const questionMap = new Map((questions ?? []).map((question) => [question.id, question.prompt]))
  const linksByProposition = new Map<string, typeof links>()
  for (const link of links ?? []) {
    if (!link.proposition_id) continue
    const list = linksByProposition.get(link.proposition_id) ?? []
    list.push(link)
    linksByProposition.set(link.proposition_id, list)
  }
  return (propositions ?? []).map((proposition): MatrixRow => {
    const propositionLinks = linksByProposition.get(proposition.id) ?? []
    return {
      questionPrompt: questionMap.get(proposition.question_id) ?? "Unlinked question",
      statement: proposition.statement,
      status: proposition.status,
      assumptions: proposition.assumptions,
      nextAction: proposition.next_action,
      supporting: propositionLinks.filter((link) => link.relationship === "supports" && link.evidence).map((link) => link.evidence as unknown as MatrixRow["supporting"][number]),
      contradicting: propositionLinks.filter((link) => link.relationship === "contradicts" && link.evidence).map((link) => link.evidence as unknown as MatrixRow["contradicting"][number]),
    }
  })
}

async function buildWitnessReport(supabase: Awaited<ReturnType<typeof createClient>>, matterId: string) {
  const [
    { data: witnessSubjects },
    { data: statements },
    { data: statementLinks },
    { data: contradictions },
    { data: reviews },
    { data: contradictionEvidence },
  ] = await Promise.all([
    supabase.from("subjects").select("id, display_name, subject_type, summary").eq("matter_id", matterId).in("subject_type", ["witness", "expert"]).order("display_name", { ascending: true }),
    supabase.from("statements").select("id, subject_id, content, statement_date, status, evidence:evidence!statements_evidence_matter_fkey(id, evidence_number, title, source_locator, event_date, provenance_status)").eq("matter_id", matterId).order("statement_date", { ascending: true }),
    supabase.from("evidence_links").select("statement_id, relationship, evidence:evidence!evidence_links_evidence_matter_fkey(id, evidence_number, title, source_locator, event_date, provenance_status)").eq("matter_id", matterId).not("statement_id", "is", null),
    supabase.from("contradictions").select("id, title, conflict_type, side_a_label, side_a_summary, side_b_label, side_b_summary, statement_a_id, statement_b_id, resolution_status, plausible_alternative_explanations, missing_evidence").eq("matter_id", matterId),
    supabase.from("contradiction_reviews").select("*").eq("matter_id", matterId),
    supabase.from("contradiction_evidence").select("contradiction_id, side, evidence:evidence!contradiction_evidence_evidence_matter_fkey(id, evidence_number, title, source_locator, event_date, provenance_status)").eq("matter_id", matterId),
  ])

  const statementSubject = new Map<string, string>()
  for (const statement of statements ?? []) statementSubject.set(statement.id, statement.subject_id ?? "")

  const linksByStatement = new Map<string, { supports: ReportEvidenceRef[]; contradicts: ReportEvidenceRef[] }>()
  for (const link of statementLinks ?? []) {
    if (!link.statement_id || !link.evidence) continue
    const bucket = linksByStatement.get(link.statement_id) ?? { supports: [], contradicts: [] }
    const evidence = link.evidence as unknown as EvidenceJoin
    if (link.relationship === "supports") bucket.supports.push(evidence)
    if (link.relationship === "contradicts") bucket.contradicts.push(evidence)
    linksByStatement.set(link.statement_id, bucket)
  }

  const reviewByContradiction = new Map((reviews ?? []).map((review) => [review.contradiction_id, review]))
  const evidenceByContradiction = new Map<string, { a: ReportEvidenceRef[]; b: ReportEvidenceRef[] }>()
  for (const link of contradictionEvidence ?? []) {
    if (!link.evidence) continue
    const bucket = evidenceByContradiction.get(link.contradiction_id) ?? { a: [], b: [] }
    const evidence = link.evidence as unknown as EvidenceJoin
    if (link.side === "a") bucket.a.push(evidence)
    else bucket.b.push(evidence)
    evidenceByContradiction.set(link.contradiction_id, bucket)
  }

  const statementsBySubject = new Map<string, WitnessStatementEntry[]>()
  for (const statement of statements ?? []) {
    if (!statement.subject_id || !statement.evidence) continue
    const links = linksByStatement.get(statement.id) ?? { supports: [], contradicts: [] }
    const list = statementsBySubject.get(statement.subject_id) ?? []
    list.push({
      id: statement.id,
      content: statement.content,
      statementDate: statement.statement_date,
      status: statement.status,
      sourceEvidence: statement.evidence as unknown as EvidenceJoin,
      corroborating: links.supports,
      contradicting: links.contradicts,
    })
    statementsBySubject.set(statement.subject_id, list)
  }

  function unresolvedQuestions(review: NonNullable<typeof reviews>[number] | undefined) {
    if (!review) return []
    return [
      review.correlation_vs_causation ? `Whether correlation is being treated as causation: ${review.correlation_vs_causation}` : null,
      review.absence_of_evidence_check ? `Whether absence of evidence is being treated as evidence of absence: ${review.absence_of_evidence_check}` : null,
      review.evidence_against_theory ? `Evidence cutting against the current account: ${review.evidence_against_theory}` : null,
    ].filter((value): value is string => Boolean(value))
  }

  function examinationTopics(contradiction: NonNullable<typeof contradictions>[number], review: NonNullable<typeof reviews>[number] | undefined) {
    return [
      `Circumstances surrounding: ${contradiction.title}`,
      review?.weakest_assumption ? `Basis for: ${review.weakest_assumption}` : null,
      review?.opposing_counsel_attack ?? null,
      review?.fact_that_would_weaken_conclusion ? `Awareness of: ${review.fact_that_would_weaken_conclusion}` : null,
    ].filter((value): value is string => Boolean(value))
  }

  return (witnessSubjects ?? [])
    .map((witness): WitnessReportEntry => {
      const ownStatements = statementsBySubject.get(witness.id) ?? []
      const witnessContradictions: WitnessContradictionEntry[] = (contradictions ?? [])
        .filter((contradiction) => {
          const subjectA = contradiction.statement_a_id ? statementSubject.get(contradiction.statement_a_id) : null
          const subjectB = contradiction.statement_b_id ? statementSubject.get(contradiction.statement_b_id) : null
          return subjectA === witness.id || subjectB === witness.id
        })
        .map((contradiction) => {
          const subjectA = contradiction.statement_a_id ? statementSubject.get(contradiction.statement_a_id) : null
          const ownSide: "a" | "b" = subjectA === witness.id ? "a" : "b"
          const otherSide: "a" | "b" = ownSide === "a" ? "b" : "a"
          const review = reviewByContradiction.get(contradiction.id)
          const sides = evidenceByContradiction.get(contradiction.id) ?? { a: [], b: [] }
          const unresolved = contradiction.resolution_status !== "resolved_a" && contradiction.resolution_status !== "resolved_b"
          return {
            id: contradiction.id,
            title: contradiction.title,
            conflictType: contradiction.conflict_type,
            ownLabel: ownSide === "a" ? contradiction.side_a_label : contradiction.side_b_label,
            ownSummary: ownSide === "a" ? contradiction.side_a_summary : contradiction.side_b_summary,
            otherLabel: otherSide === "a" ? contradiction.side_a_label : contradiction.side_b_label,
            otherSummary: otherSide === "a" ? contradiction.side_a_summary : contradiction.side_b_summary,
            resolutionStatus: contradiction.resolution_status,
            plausibleAlternativeExplanations: contradiction.plausible_alternative_explanations,
            missingEvidence: contradiction.missing_evidence,
            ownSideEvidence: sides[ownSide],
            otherSideEvidence: sides[otherSide],
            unresolvedCredibilityQuestions: unresolved ? unresolvedQuestions(review) : [],
            examinationTopics: examinationTopics(contradiction, review),
          }
        })
      return {
        subjectId: witness.id,
        displayName: witness.display_name,
        subjectType: witness.subject_type,
        summary: witness.summary,
        statements: ownStatements,
        contradictions: witnessContradictions,
      }
    })
    .filter((witness) => witness.statements.length > 0 || witness.contradictions.length > 0)
}

export async function GET(_request: Request, { params }: { params: Promise<{ matterId: string; reportType: string }> }) {
  const { matterId, reportType } = await params
  if (!isReportType(reportType)) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const supabase = await createClient()
  const { data: matter } = await supabase.from("matters").select("id, name, matter_number").eq("id", matterId).maybeSingle()
  if (!matter) return NextResponse.json({ error: "Matter not found" }, { status: 404 })

  const generatedAt = formatDate(new Date().toISOString())
  const bytes = reportType === "proposition-evidence-matrix"
    ? await createPropositionEvidenceMatrixPdf({ matterName: matter.name, matterNumber: matter.matter_number, generatedAt, rows: await buildMatrix(supabase, matterId) })
    : await createWitnessContradictionPdf({ matterName: matter.name, matterNumber: matter.matter_number, generatedAt, witnesses: await buildWitnessReport(supabase, matterId) })

  await supabase.from("reports").insert({
    matter_id: matterId,
    report_type: reportType === "proposition-evidence-matrix" ? "proposition_evidence_matrix" : "witness_contradiction_report",
    title: reportType === "proposition-evidence-matrix" ? "Proposition Evidence Matrix" : "Witness Contradiction Report",
    status: "available",
    generated_by: user.id,
  })

  const filename = `${filenamePart(matter.matter_number)}-${reportType}.pdf`
  return new NextResponse(bytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
