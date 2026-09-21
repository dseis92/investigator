"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { logAuditEvent } from "@/lib/audit/log-audit-event"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error: string | null }

export async function createContradiction(
  matterId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim()
  const conflictType = String(formData.get("conflict_type") ?? "")
  const sideALabel = String(formData.get("side_a_label") ?? "").trim()
  const sideASummary = String(formData.get("side_a_summary") ?? "").trim()
  const sideBLabel = String(formData.get("side_b_label") ?? "").trim()
  const sideBSummary = String(formData.get("side_b_summary") ?? "").trim()
  const plausibleAlternativeExplanations = String(formData.get("plausible_alternative_explanations") ?? "").trim() || null
  const missingEvidence = String(formData.get("missing_evidence") ?? "").trim() || null
  const impactIfA = String(formData.get("impact_if_a") ?? "").trim() || null
  const impactIfB = String(formData.get("impact_if_b") ?? "").trim() || null

  if (!title || !conflictType || !sideALabel || !sideASummary || !sideBLabel || !sideBSummary) {
    return { error: "Title, conflict type, and both sides are required." }
  }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("contradictions")
    .insert({
      matter_id: matterId,
      title,
      conflict_type: conflictType,
      side_a_label: sideALabel,
      side_a_summary: sideASummary,
      side_b_label: sideBLabel,
      side_b_summary: sideBSummary,
      plausible_alternative_explanations: plausibleAlternativeExplanations,
      missing_evidence: missingEvidence,
      impact_if_a: impactIfA,
      impact_if_b: impactIfB,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "contradiction",
    entityId: data.id,
    action: "create",
    summary: `Logged contradiction: ${title}`,
  })

  revalidatePath(`/matters/${matterId}/contradictions`)
  revalidatePath(`/matters/${matterId}`)
  redirect(`/matters/${matterId}/contradictions/${data.id}`)
}

export async function addContradictionEvidence(
  matterId: string,
  contradictionId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const side = String(formData.get("side") ?? "")
  const evidenceId = String(formData.get("evidence_id") ?? "")
  if (!side || !evidenceId) return { error: "Select a side and an evidence item." }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.from("contradiction_evidence").insert({
    matter_id: matterId,
    contradiction_id: contradictionId,
    side,
    evidence_id: evidenceId,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "contradiction",
    entityId: contradictionId,
    action: "update",
    summary: `Cited evidence on side ${side.toUpperCase()}`,
  })

  revalidatePath(`/matters/${matterId}/contradictions/${contradictionId}`)
  return { error: null }
}

export async function upsertContradictionReview(
  matterId: string,
  contradictionId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCurrentUser()
  const supabase = await createClient()

  const payload = {
    matter_id: matterId,
    contradiction_id: contradictionId,
    weakest_assumption: String(formData.get("weakest_assumption") ?? "").trim() || null,
    evidence_against_theory: String(formData.get("evidence_against_theory") ?? "").trim() || null,
    correlation_vs_causation: String(formData.get("correlation_vs_causation") ?? "").trim() || null,
    absence_of_evidence_check: String(formData.get("absence_of_evidence_check") ?? "").trim() || null,
    opposing_counsel_attack: String(formData.get("opposing_counsel_attack") ?? "").trim() || null,
    fact_that_would_weaken_conclusion: String(formData.get("fact_that_would_weaken_conclusion") ?? "").trim() || null,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("contradiction_reviews").upsert(payload, { onConflict: "contradiction_id" })
  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "contradiction",
    entityId: contradictionId,
    action: "review",
    summary: "Completed the adversarial review checklist",
  })

  revalidatePath(`/matters/${matterId}/contradictions/${contradictionId}`)
  return { error: null }
}

export async function updateResolutionStatus(matterId: string, contradictionId: string, resolutionStatus: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("contradictions")
    .update({ resolution_status: resolutionStatus })
    .eq("id", contradictionId)

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "contradiction",
    entityId: contradictionId,
    action: "status_change",
    summary: `Resolution status changed to ${resolutionStatus}`,
  })

  revalidatePath(`/matters/${matterId}/contradictions/${contradictionId}`)
  revalidatePath(`/matters/${matterId}/contradictions`)
  return { error: null }
}
