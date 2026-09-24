import { NextResponse } from "next/server"

import type { MatrixRow } from "@/components/reports/proposition-evidence-matrix-table"
import type { ReportEvidenceRef, WitnessContradictionEntry, WitnessReportEntry, WitnessStatementEntry } from "@/components/reports/witness-contradiction-report"
import { getCurrentUser } from "@/lib/auth/get-current-user"
import { formatDate } from "@/lib/format"
import { createDerivedReportPdf, createPropositionEvidenceMatrixPdf, createWitnessContradictionPdf, type PdfReportSection } from "@/lib/reports/pdf"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const reportDefinitions = {
  "proposition-evidence-matrix": {
    databaseType: "proposition_evidence_matrix",
    title: "Proposition Evidence Matrix",
    description: "A proposition-by-proposition review of supporting and contradicting evidence recorded in the matter workspace.",
  },
  "master-chronology": {
    databaseType: "master_chronology",
    title: "Master Chronology",
    description: "A single chronological view of events, evidence, statements, deadlines, and appointments recorded in the matter.",
  },
  "investigative-memorandum": {
    databaseType: "investigative_memorandum",
    title: "Investigative Memorandum",
    description: "A structured, neutral memorandum assembled from questions, propositions, leads, contradictions, and reviewed analysis records.",
  },
  "witness-contradiction-report": {
    databaseType: "witness_contradiction_report",
    title: "Witness Contradiction Report",
    description: "Witness and expert statements, materially different descriptions, cited evidence, and recorded adversarial review questions.",
  },
  "evidence-source-index": {
    databaseType: "evidence_source_index",
    title: "Evidence / Source Index",
    description: "The matter evidence ledger grouped by source locator, with provenance and authentication states preserved for review.",
  },
  "case-theory-stress-test": {
    databaseType: "case_theory_stress_test",
    title: "Case-Theory Stress Test",
    description: "A disciplined challenge to the current theory using contradictory links, unresolved conflicts, assumptions, and recorded attack questions.",
  },
} as const

type ReportType = keyof typeof reportDefinitions

function isReportType(value: string): value is ReportType {
  return value in reportDefinitions
}

function filenamePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "matter"
}

type EvidenceJoin = ReportEvidenceRef & { id: string }

type ReportSupabase = Awaited<ReturnType<typeof createClient>>

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

async function buildMasterChronology(supabase: ReportSupabase, matterId: string): Promise<PdfReportSection[]> {
  const [{ data: events }, { data: evidence }, { data: statements }, { data: deadlines }, { data: appointments }] = await Promise.all([
    supabase.from("events").select("title, description, event_start, category, confidence").eq("matter_id", matterId).order("event_start", { ascending: true }),
    supabase.from("evidence").select("evidence_number, title, event_date, source_locator, provenance_status").eq("matter_id", matterId).order("event_date", { ascending: true }),
    supabase.from("statements").select("content, statement_date, status, subject:subjects!statements_subject_matter_fkey(display_name)").eq("matter_id", matterId).order("statement_date", { ascending: true }),
    supabase.from("matter_deadlines").select("title, due_at, kind, status, priority").eq("matter_id", matterId).order("due_at", { ascending: true }),
    supabase.from("appointments").select("title, starts_at, ends_at, status, client_name").eq("matter_id", matterId).neq("status", "cancelled").order("starts_at", { ascending: true }),
  ])
  const rows: { date: string; label: string; detail: string; tone: "normal" | "warn" }[] = [
    ...(events ?? []).map((event) => ({ date: event.event_start, label: event.title, detail: `${event.category ?? "event"} · ${event.confidence}${event.description ? ` · ${event.description}` : ""}`, tone: event.confidence === "disputed" ? "warn" as const : "normal" as const })),
    ...(evidence ?? []).filter((item) => item.event_date).map((item) => ({ date: item.event_date as string, label: `${item.evidence_number} · ${item.title}`, detail: `Evidence record · ${item.source_locator ?? "Source locator not recorded"} · provenance ${item.provenance_status}`, tone: "normal" as const })),
    ...(statements ?? []).filter((item) => item.statement_date).map((item) => ({ date: item.statement_date as string, label: `${(item.subject as { display_name: string } | null)?.display_name ?? "Statement"}`, detail: `${item.content} · ${item.status}`, tone: item.status === "disputed" ? "warn" as const : "normal" as const })),
    ...(deadlines ?? []).map((deadline) => ({ date: deadline.due_at, label: `Deadline · ${deadline.title}`, detail: `${deadline.kind} · ${deadline.priority} priority · ${deadline.status}`, tone: deadline.status === "missed" ? "warn" as const : "normal" as const })),
    ...(appointments ?? []).map((appointment) => ({ date: appointment.starts_at, label: `Appointment · ${appointment.title}`, detail: `${appointment.client_name ?? "No client recorded"} · ${appointment.status}${appointment.ends_at ? ` · ends ${new Date(appointment.ends_at).toLocaleString()}` : ""}`, tone: "normal" as const })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return [{ heading: "Chronology", body: rows.length ? "Records are ordered by their recorded date or scheduled start. Same-day conflicts and missing dates remain visible in the underlying record." : "No dated records exist for this matter yet.", items: rows.map((row) => ({ label: new Date(row.date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }), detail: `${row.label} - ${row.detail}`, tone: row.tone })) }]
}

async function buildInvestigativeMemorandum(supabase: ReportSupabase, matterId: string): Promise<PdfReportSection[]> {
  const [{ data: matter }, { data: questions }, { data: propositions }, { data: leads }, { data: contradictions }, { data: analyses }] = await Promise.all([
    supabase.from("matters").select("status, defense_theory, opposing_theory").eq("id", matterId).maybeSingle(),
    supabase.from("questions").select("prompt, status").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("propositions").select("statement, status, next_action").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("leads").select("description, status, assigned_to").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("contradictions").select("title, resolution_status, missing_evidence").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("analyses").select("title, summary, status, recommended_next_steps").eq("matter_id", matterId).order("created_at", { ascending: false }).limit(20),
  ])
  return [
    { heading: "Matter posture", body: `${matter?.status ?? "Unknown"} matter. Defense theory: ${matter?.defense_theory || "not recorded"}. Opposing theory: ${matter?.opposing_theory || "not recorded"}.` },
    { heading: "Open questions", items: (questions ?? []).map((item) => ({ label: item.prompt, detail: `Status: ${item.status}`, tone: item.status === "open" ? "warn" as const : "normal" as const })) },
    { heading: "Propositions and next actions", items: (propositions ?? []).map((item) => ({ label: item.statement, detail: `${item.status}${item.next_action ? ` · next action: ${item.next_action}` : ""}`, tone: item.status === "disputed" ? "warn" as const : "normal" as const })) },
    { heading: "Leads requiring work", items: (leads ?? []).map((item) => ({ label: item.description, detail: `${item.status}${item.assigned_to ? " · assigned" : " · unassigned"}`, tone: item.status === "open" ? "warn" as const : "normal" as const })) },
    { heading: "Contradictions and limitations", items: (contradictions ?? []).map((item) => ({ label: item.title, detail: `${item.resolution_status}${item.missing_evidence ? ` · missing evidence: ${item.missing_evidence}` : ""}`, tone: item.resolution_status === "unresolved" ? "warn" as const : "normal" as const })) },
    { heading: "Analysis drafts", items: (analyses ?? []).map((item) => ({ label: item.title, detail: `${item.status} · ${item.summary}${item.recommended_next_steps ? ` · next: ${item.recommended_next_steps}` : ""}`, tone: item.status === "final" ? "good" as const : "normal" as const })) },
  ]
}

async function buildEvidenceSourceIndex(supabase: ReportSupabase, matterId: string): Promise<PdfReportSection[]> {
  const { data: evidence } = await supabase.from("evidence").select("evidence_number, title, artifact_type, source_locator, event_date, provenance_status, authentication_status").eq("matter_id", matterId).order("evidence_number", { ascending: true })
  const grouped = new Map<string, NonNullable<typeof evidence>>()
  for (const item of evidence ?? []) {
    const key = item.source_locator?.split(":")[0] || "Source not recorded"
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }
  return [...grouped.entries()].map(([source, items]) => ({
    heading: source,
    items: items.map((item) => ({ label: `${item.evidence_number} · ${item.title}`, detail: `${item.artifact_type} · ${item.event_date ? new Date(item.event_date).toLocaleDateString() : "Date not recorded"} · locator ${item.source_locator ?? "not recorded"} · provenance ${item.provenance_status} · authentication ${item.authentication_status}`, tone: item.provenance_status === "weak" || item.authentication_status === "unverified" ? "warn" as const : "normal" as const })),
  }))
}

async function buildCaseTheoryStressTest(supabase: ReportSupabase, matterId: string): Promise<PdfReportSection[]> {
  const [{ data: matter }, { data: propositions }, { data: contradictions }, { data: reviews }, { data: links }] = await Promise.all([
    supabase.from("matters").select("defense_theory, opposing_theory").eq("id", matterId).maybeSingle(),
    supabase.from("propositions").select("id, statement, status, assumptions, next_action").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("contradictions").select("id, title, resolution_status, plausible_alternative_explanations, missing_evidence").eq("matter_id", matterId),
    supabase.from("contradiction_reviews").select("contradiction_id, weakest_assumption, opposing_counsel_attack, fact_that_would_weaken_conclusion").eq("matter_id", matterId),
    supabase.from("evidence_links").select("proposition_id, relationship").eq("matter_id", matterId).not("proposition_id", "is", null),
  ])
  const linkCounts = new Map<string, { supports: number; contradicts: number }>()
  for (const link of links ?? []) { if (!link.proposition_id) continue; const count = linkCounts.get(link.proposition_id) ?? { supports: 0, contradicts: 0 }; if (link.relationship === "supports") count.supports += 1; if (link.relationship === "contradicts") count.contradicts += 1; linkCounts.set(link.proposition_id, count) }
  const reviewMap = new Map((reviews ?? []).map((review) => [review.contradiction_id, review]))
  return [
    { heading: "Current theory", body: `Defense theory: ${matter?.defense_theory || "not recorded"}. Opposing theory: ${matter?.opposing_theory || "not recorded"}.` },
    { heading: "Propositions under pressure", items: (propositions ?? []).map((item) => { const count = linkCounts.get(item.id) ?? { supports: 0, contradicts: 0 }; return { label: item.statement, detail: `${count.supports} supporting link(s) · ${count.contradicts} contradicting link(s) · status ${item.status}${item.assumptions ? ` · assumption: ${item.assumptions}` : ""}${item.next_action ? ` · next: ${item.next_action}` : ""}`, tone: count.contradicts > 0 || count.supports === 0 ? "warn" as const : "normal" as const } }) },
    { heading: "Unresolved contradictions", items: (contradictions ?? []).filter((item) => item.resolution_status !== "resolved_a" && item.resolution_status !== "resolved_b").map((item) => { const review = reviewMap.get(item.id); return { label: item.title, detail: `${item.resolution_status}${item.plausible_alternative_explanations ? ` · alternatives: ${item.plausible_alternative_explanations}` : ""}${item.missing_evidence ? ` · missing: ${item.missing_evidence}` : ""}${review?.weakest_assumption ? ` · weakest assumption: ${review.weakest_assumption}` : ""}${review?.opposing_counsel_attack ? ` · opposing attack: ${review.opposing_counsel_attack}` : ""}`, tone: "warn" as const } }) },
  ]
}

export async function GET(_request: Request, { params }: { params: Promise<{ matterId: string; reportType: string }> }) {
  const { matterId, reportType } = await params
  if (!isReportType(reportType)) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const supabase = await createClient()
  const { data: matter } = await supabase.from("matters").select("id, name, matter_number, status, defense_theory, opposing_theory").eq("id", matterId).maybeSingle()
  if (!matter) return NextResponse.json({ error: "Matter not found" }, { status: 404 })

  const definition = reportDefinitions[reportType]
  const generatedAt = formatDate(new Date().toISOString())
  let bytes: Uint8Array
  if (reportType === "proposition-evidence-matrix") {
    bytes = await createPropositionEvidenceMatrixPdf({ matterName: matter.name, matterNumber: matter.matter_number, generatedAt, rows: await buildMatrix(supabase, matterId) })
  } else if (reportType === "witness-contradiction-report") {
    bytes = await createWitnessContradictionPdf({ matterName: matter.name, matterNumber: matter.matter_number, generatedAt, witnesses: await buildWitnessReport(supabase, matterId) })
  } else {
    const sections = reportType === "master-chronology"
      ? await buildMasterChronology(supabase, matterId)
      : reportType === "investigative-memorandum"
        ? await buildInvestigativeMemorandum(supabase, matterId)
        : reportType === "evidence-source-index"
          ? await buildEvidenceSourceIndex(supabase, matterId)
          : await buildCaseTheoryStressTest(supabase, matterId)
    bytes = await createDerivedReportPdf({ matterName: matter.name, matterNumber: matter.matter_number, generatedAt, reportTitle: definition.title, description: definition.description, sections })
  }

  const filename = `${filenamePart(matter.matter_number)}-${reportType}.pdf`

  const { error: historyError } = await supabase.from("reports").insert({
    matter_id: matterId,
    report_type: definition.databaseType,
    title: definition.title,
    status: "available",
    generated_by: user.id,
    output_format: "pdf",
    file_name: filename,
    byte_size: bytes.byteLength,
  })
  if (historyError) console.error("Failed to record report history", historyError)

  return new NextResponse(bytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
