import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { recordReportGenerated } from "./actions"
import { MatterHeader } from "@/components/matters/matter-header"
import { PrintButton } from "@/components/reports/print-button"
import { PropositionEvidenceMatrixTable, type MatrixRow } from "@/components/reports/proposition-evidence-matrix-table"
import { formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Proposition Evidence Matrix" }

export default async function PropositionEvidenceMatrixPage({
  params,
}: {
  params: Promise<{ matterId: string }>
}) {
  const { matterId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const [{ data: questions }, { data: propositions }, { data: links }] = await Promise.all([
    supabase.from("questions").select("id, prompt").eq("matter_id", matterId),
    supabase
      .from("propositions")
      .select("id, question_id, statement, status, assumptions, next_action")
      .eq("matter_id", matterId)
      .order("created_at", { ascending: true }),
    supabase
      .from("evidence_links")
      .select(
        "proposition_id, relationship, evidence:evidence(evidence_number, title, source_locator, event_date, provenance_status)"
      )
      .eq("matter_id", matterId)
      .not("proposition_id", "is", null),
  ])

  const questionMap = new Map((questions ?? []).map((q) => [q.id, q.prompt]))
  const linksByProp = new Map<string, typeof links>()
  for (const link of links ?? []) {
    if (!link.proposition_id) continue
    const list = linksByProp.get(link.proposition_id) ?? []
    list.push(link)
    linksByProp.set(link.proposition_id, list)
  }

  const rows: MatrixRow[] = (propositions ?? []).map((p) => {
    const propLinks = linksByProp.get(p.id) ?? []
    return {
      questionPrompt: questionMap.get(p.question_id) ?? "Unlinked question",
      statement: p.statement,
      status: p.status,
      assumptions: p.assumptions,
      nextAction: p.next_action,
      supporting: propLinks
        .filter((l) => l.relationship === "supports" && l.evidence)
        .map((l) => l.evidence as unknown as MatrixRow["supporting"][number]),
      contradicting: propLinks
        .filter((l) => l.relationship === "contradicts" && l.evidence)
        .map((l) => l.evidence as unknown as MatrixRow["contradicting"][number]),
    }
  })

  const generatedAt = formatDate(new Date().toISOString())

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Proposition Evidence Matrix" />

      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Every proposition with its supporting and contradicting evidence, cited by evidence ID and source locator.
        </p>
        <PrintButton onBeforePrint={recordReportGenerated.bind(null, matterId)} />
      </div>

      <div className="hidden print:block">
        <h1 className="text-lg font-semibold">Proposition Evidence Matrix — {matter.name}</h1>
        <p className="text-xs text-muted-foreground">
          {matter.matter_number} · Generated {generatedAt}
        </p>
      </div>

      {rows.length > 0 ? (
        <PropositionEvidenceMatrixTable rows={rows} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No propositions exist for this matter yet, so the matrix is empty. Add questions and propositions first.
        </p>
      )}

      <p className="text-xs text-muted-foreground print:mt-4">
        Limitations: this report reflects only propositions and evidence links recorded in TraceLine as of the
        generation time above. Provenance badges reflect the status recorded on the evidence item, not courtroom
        authentication. Unlinked propositions are flagged inline as a limitation of the current record, not treated
        as false.
      </p>
    </div>
  )
}
