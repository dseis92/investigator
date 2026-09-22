"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { generateAnalysisDraft, type EvidenceContext, type StatementContext } from "@/lib/ai/analysis-draft"
import { logAuditEvent } from "@/lib/audit/log-audit-event"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { canFinalizeAnalysis, getMatterRole } from "@/lib/matters/get-role"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error: string | null }

export async function generateDraft(
  matterId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const propositionId = String(formData.get("proposition_id") ?? "")
  if (!propositionId) return { error: "Select a proposition to analyze." }

  const user = await requireCurrentUser()
  const supabase = await createClient()

  const { data: proposition } = await supabase
    .from("propositions")
    .select("id, statement, question_id, question:questions!propositions_question_matter_fkey(prompt)")
    .eq("id", propositionId)
    .eq("matter_id", matterId)
    .maybeSingle()
  if (!proposition) return { error: "Proposition not found." }

  const { data: links } = await supabase
    .from("evidence_links")
    .select(
      "relationship, evidence:evidence!evidence_links_evidence_matter_fkey(id, evidence_number, title, artifact_type, source_locator, event_date, provenance_status, authentication_status)"
    )
    .eq("matter_id", matterId)
    .eq("proposition_id", propositionId)

  type EvidenceRow = {
    id: string
    evidence_number: string
    title: string
    artifact_type: string
    source_locator: string | null
    event_date: string | null
    provenance_status: string
    authentication_status: string
  }

  const evidenceRows = (links ?? [])
    .filter((l) => l.evidence)
    .map((l) => ({ relationship: l.relationship, evidence: l.evidence as unknown as EvidenceRow }))

  const evidenceIds = evidenceRows.map((r) => r.evidence.id)

  const [{ data: annotations }, { data: statementRows }] = await Promise.all([
    evidenceIds.length > 0
      ? supabase.from("evidence_annotations").select("evidence_id, body").in("evidence_id", evidenceIds)
      : Promise.resolve({ data: [] as { evidence_id: string; body: string }[] }),
    evidenceIds.length > 0
      ? supabase
          .from("statements")
          .select("content, status, subject:subjects!statements_subject_matter_fkey(display_name)")
          .in("evidence_id", evidenceIds)
      : Promise.resolve({ data: [] as { content: string; status: string; subject: { display_name: string } | null }[] }),
  ])

  const annotationsByEvidence = new Map<string, string[]>()
  for (const a of annotations ?? []) {
    const list = annotationsByEvidence.get(a.evidence_id) ?? []
    list.push(a.body)
    annotationsByEvidence.set(a.evidence_id, list)
  }

  const evidenceContext: EvidenceContext[] = evidenceRows.map((r) => ({
    evidenceNumber: r.evidence.evidence_number,
    title: r.evidence.title,
    artifactType: r.evidence.artifact_type,
    sourceLocator: r.evidence.source_locator,
    eventDate: r.evidence.event_date,
    provenanceStatus: r.evidence.provenance_status,
    authenticationStatus: r.evidence.authentication_status,
    relationship: r.relationship,
    annotations: annotationsByEvidence.get(r.evidence.id) ?? [],
  }))

  const statementContext: StatementContext[] = (statementRows ?? []).map((s) => ({
    content: s.content,
    status: s.status,
    subjectName: (s.subject as { display_name: string } | null)?.display_name ?? null,
  }))

  let generated
  try {
    generated = await generateAnalysisDraft({
      questionPrompt: (proposition.question as unknown as { prompt: string } | null)?.prompt ?? "",
      propositionStatement: proposition.statement,
      evidence: evidenceContext,
      statements: statementContext,
    })
  } catch (err) {
    return { error: err instanceof Error ? `AI generation failed: ${err.message}` : "AI generation failed." }
  }

  const { draft, model, droppedEvidenceIds } = generated
  const evidenceIdByNumber = new Map(evidenceRows.map((r) => [r.evidence.evidence_number, r.evidence.id]))

  const limitationsText =
    droppedEvidenceIds.length > 0
      ? `${draft.unknownsAndLimitations}\n\nNote: the model referenced evidence ID(s) not found in this matter's ledger and they were omitted: ${droppedEvidenceIds.join(", ")}.`
      : draft.unknownsAndLimitations

  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .insert({
      matter_id: matterId,
      proposition_id: proposition.id,
      question_id: proposition.question_id,
      title: `Draft analysis: ${proposition.statement.slice(0, 80)}`,
      summary: draft.summary,
      contradicting_evidence_summary: draft.contradictoryOrAdverseEvidence,
      missing_evidence_summary: limitationsText,
      recommended_next_steps: draft.suggestedNextAction,
      generated_by: "ai",
      ai_model: model,
      ai_prompt_ref: `proposition:${proposition.id}`,
      status: "draft",
      authored_by: user.id,
    })
    .select("id")
    .single()

  if (analysisError || !analysis) return { error: analysisError?.message ?? "Failed to save the draft." }

  for (const conclusion of draft.conclusions) {
    const { data: conclusionRow, error: conclusionError } = await supabase
      .from("analysis_conclusions")
      .insert({
        matter_id: matterId,
        analysis_id: analysis.id,
        conclusion_text: conclusion.text,
        classification: conclusion.classification,
        created_by: user.id,
      })
      .select("id")
      .single()
    if (conclusionError || !conclusionRow) continue

    const resolvedEvidenceIds = conclusion.evidenceIds
      .map((num) => evidenceIdByNumber.get(num))
      .filter((id): id is string => Boolean(id))

    if (resolvedEvidenceIds.length > 0) {
      await supabase.from("analysis_conclusion_evidence").insert(
        resolvedEvidenceIds.map((evidenceId) => ({
          matter_id: matterId,
          conclusion_id: conclusionRow.id,
          evidence_id: evidenceId,
        }))
      )
    }
  }

  await logAuditEvent({
    matterId,
    entityType: "analysis",
    entityId: analysis.id,
    action: "create",
    summary: `Generated an AI-drafted analysis for proposition: ${proposition.statement.slice(0, 80)}`,
  })

  revalidatePath(`/matters/${matterId}/analysis`)
  redirect(`/matters/${matterId}/analysis/${analysis.id}`)
}

export async function updateAnalysisDraft(
  matterId: string,
  analysisId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const summary = String(formData.get("summary") ?? "").trim()
  const contradicting = String(formData.get("contradicting_evidence_summary") ?? "").trim() || null
  const limitations = String(formData.get("missing_evidence_summary") ?? "").trim() || null
  const nextSteps = String(formData.get("recommended_next_steps") ?? "").trim() || null

  if (!summary) return { error: "Summary is required." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("analyses")
    .update({
      summary,
      contradicting_evidence_summary: contradicting,
      missing_evidence_summary: limitations,
      recommended_next_steps: nextSteps,
      status: "under_review",
    })
    .eq("id", analysisId)

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "analysis",
    entityId: analysisId,
    action: "update",
    summary: "Revised analysis draft",
  })

  revalidatePath(`/matters/${matterId}/analysis/${analysisId}`)
  return { error: null }
}

export async function reviewAnalysis(
  matterId: string,
  analysisId: string,
  decision: "approved" | "rejected",
  notes?: string
) {
  const role = await getMatterRole(matterId)
  if (!canFinalizeAnalysis(role)) {
    return { error: "Your role does not permit finalizing or rejecting an analysis." }
  }

  const supabase = await createClient()
  const newStatus = decision === "approved" ? "final" : "rejected"

  const { error: updateError } = await supabase.from("analyses").update({ status: newStatus }).eq("id", analysisId)
  if (updateError) return { error: updateError.message }

  const { error: decisionError } = await supabase.rpc("log_review_decision", {
    p_matter_id: matterId,
    p_entity_type: "analysis",
    p_entity_id: analysisId,
    p_decision: decision,
    p_notes: notes,
  })
  if (decisionError) return { error: decisionError.message }

  await logAuditEvent({
    matterId,
    entityType: "analysis",
    entityId: analysisId,
    action: "status_change",
    summary: decision === "approved" ? "Approved analysis as final" : "Rejected analysis draft",
  })

  revalidatePath(`/matters/${matterId}/analysis/${analysisId}`)
  revalidatePath(`/matters/${matterId}/analysis`)
  return { error: null }
}
