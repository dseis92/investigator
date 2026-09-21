"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { logAuditEvent } from "@/lib/audit/log-audit-event"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { getMatterRole, canExcludeEvidence } from "@/lib/matters/get-role"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error: string | null }

async function findOrCreateSource(matterId: string, userId: string, name: string, sourceType: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("sources")
    .select("id")
    .eq("matter_id", matterId)
    .eq("name", name)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from("sources")
    .insert({ matter_id: matterId, name, source_type: sourceType, created_by: userId })
    .select("id")
    .single()

  if (error) throw error
  return data.id
}

export async function createEvidence(matterId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim()
  const evidenceNumber = String(formData.get("evidence_number") ?? "").trim()
  const artifactType = String(formData.get("artifact_type") ?? "")
  const sourceName = String(formData.get("source_name") ?? "").trim()
  const sourceType = String(formData.get("source_type") ?? "other")
  const sourceLocator = String(formData.get("source_locator") ?? "").trim() || null
  const capturedAt = String(formData.get("captured_at") ?? "") || null
  const eventDate = String(formData.get("event_date") ?? "") || null
  const recordDate = String(formData.get("record_date") ?? "") || null
  const collector = String(formData.get("collector") ?? "").trim() || null
  const custodian = String(formData.get("custodian") ?? "").trim() || null
  const artifactRef = String(formData.get("artifact_ref") ?? "").trim() || null
  const artifactHash = String(formData.get("artifact_hash") ?? "").trim() || null
  const provenanceStatus = String(formData.get("provenance_status") ?? "unknown")
  const identityMatchStatus = String(formData.get("identity_match_status") ?? "unresolved")
  const relevance = String(formData.get("relevance") ?? "") || null
  const authenticationStatus = String(formData.get("authentication_status") ?? "unauthenticated")

  if (!title || !evidenceNumber || !artifactType) {
    return { error: "Evidence number, title, and artifact type are required." }
  }

  const user = await requireCurrentUser()

  let sourceId: string | null = null
  if (sourceName) {
    try {
      sourceId = await findOrCreateSource(matterId, user.id, sourceName, sourceType)
    } catch {
      return { error: "Could not create the source record." }
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("evidence")
    .insert({
      matter_id: matterId,
      evidence_number: evidenceNumber,
      title,
      artifact_type: artifactType,
      source_id: sourceId,
      source_locator: sourceLocator,
      captured_at: capturedAt,
      event_date: eventDate,
      record_date: recordDate,
      collector,
      custodian,
      artifact_ref: artifactRef,
      artifact_hash: artifactHash,
      provenance_status: provenanceStatus,
      identity_match_status: identityMatchStatus,
      relevance,
      authentication_status: authenticationStatus,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "evidence",
    entityId: data.id,
    action: "create",
    summary: `Captured evidence ${evidenceNumber}: ${title}`,
  })

  revalidatePath(`/matters/${matterId}/evidence`)
  revalidatePath(`/matters/${matterId}`)
  redirect(`/matters/${matterId}/evidence/${data.id}`)
}

export async function addAnnotation(matterId: string, evidenceId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const body = String(formData.get("body") ?? "").trim()
  if (!body) return { error: "Annotation text is required." }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.from("evidence_annotations").insert({
    matter_id: matterId,
    evidence_id: evidenceId,
    author_id: user.id,
    body,
  })

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "evidence",
    entityId: evidenceId,
    action: "update",
    summary: "Added an analyst annotation",
  })

  revalidatePath(`/matters/${matterId}/evidence/${evidenceId}`)
  return { error: null }
}

export async function updateReviewState(matterId: string, evidenceId: string, reviewState: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("evidence").update({ review_state: reviewState }).eq("id", evidenceId)
  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "evidence",
    entityId: evidenceId,
    action: "status_change",
    summary: `Review state changed to ${reviewState}`,
  })

  revalidatePath(`/matters/${matterId}/evidence/${evidenceId}`)
  revalidatePath(`/matters/${matterId}/evidence`)
  return { error: null }
}

export async function excludeEvidence(matterId: string, evidenceId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const role = await getMatterRole(matterId)
  if (!canExcludeEvidence(role)) {
    return { error: "Your role does not permit excluding evidence." }
  }

  const reason = String(formData.get("excluded_reason") ?? "").trim()
  if (!reason) return { error: "A reason is required to exclude evidence." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("evidence")
    .update({ is_excluded: true, excluded_reason: reason, review_state: "excluded" })
    .eq("id", evidenceId)

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "evidence",
    entityId: evidenceId,
    action: "exclude",
    summary: `Excluded evidence: ${reason}`,
  })

  revalidatePath(`/matters/${matterId}/evidence/${evidenceId}`)
  revalidatePath(`/matters/${matterId}/evidence`)
  return { error: null }
}

export async function supersedeEvidence(
  matterId: string,
  evidenceId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supersededBy = String(formData.get("superseded_by") ?? "")
  if (!supersededBy) return { error: "Select the evidence item that replaces this one." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("evidence")
    .update({ superseded_by: supersededBy, provenance_status: "superseded", review_state: "reviewed" })
    .eq("id", evidenceId)

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "evidence",
    entityId: evidenceId,
    action: "supersede",
    summary: "Marked as superseded by a corrected evidence item",
    newValue: { superseded_by: supersededBy },
  })

  revalidatePath(`/matters/${matterId}/evidence/${evidenceId}`)
  revalidatePath(`/matters/${matterId}/evidence`)
  return { error: null }
}

export async function restoreEvidence(matterId: string, evidenceId: string) {
  const role = await getMatterRole(matterId)
  if (!canExcludeEvidence(role)) {
    return { error: "Your role does not permit restoring evidence." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("evidence")
    .update({ is_excluded: false, excluded_reason: null, review_state: "under_review" })
    .eq("id", evidenceId)

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "evidence",
    entityId: evidenceId,
    action: "restore",
    summary: "Restored previously excluded evidence",
  })

  revalidatePath(`/matters/${matterId}/evidence/${evidenceId}`)
  revalidatePath(`/matters/${matterId}/evidence`)
  return { error: null }
}
