"use server"

import { revalidatePath } from "next/cache"
import { createHash, randomUUID } from "node:crypto"
import { redirect } from "next/navigation"

import { logAuditEvent } from "@/lib/audit/log-audit-event"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { getMatterRole, canExcludeEvidence } from "@/lib/matters/get-role"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error: string | null }

export type ArtifactActionState = { error: string | null; artifactId?: string; replacedArtifactId?: string }

const MAX_ARTIFACT_SIZE = 50 * 1024 * 1024
const ALLOWED_ARTIFACT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "artifact"
}

export async function uploadEvidenceArtifact(
  matterId: string,
  evidenceId: string,
  _prevState: ArtifactActionState,
  formData: FormData
): Promise<ArtifactActionState> {
  const file = formData.get("artifact")
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file before uploading." }
  if (file.size > MAX_ARTIFACT_SIZE) return { error: "Files must be 50 MB or smaller." }
  if (!ALLOWED_ARTIFACT_TYPES.has(file.type)) return { error: "That file type is not supported yet." }
  const replacesArtifactId = String(formData.get("replaces_artifact_id") ?? "").trim() || null

  const user = await requireCurrentUser()
  const role = await getMatterRole(matterId)
  if (replacesArtifactId && !canExcludeEvidence(role)) {
    return { error: "Only attorneys, administrators, and investigators can replace a preserved artifact." }
  }
  const supabase = await createClient()
  const { data: evidence } = await supabase.from("evidence").select("id").eq("id", evidenceId).eq("matter_id", matterId).maybeSingle()
  if (!evidence) return { error: "This evidence item is not available in the selected matter." }

  if (replacesArtifactId) {
    const { data: original } = await supabase
      .from("evidence_artifacts")
      .select("id, evidence_id, lifecycle_status")
      .eq("id", replacesArtifactId)
      .eq("matter_id", matterId)
      .maybeSingle()
    if (!original || original.evidence_id !== evidenceId) return { error: "Choose an artifact attached to this evidence record." }
    if (original.lifecycle_status === "released") return { error: "Released artifacts cannot be replaced." }
  }

  const storagePath = `${matterId}/${evidenceId}/${randomUUID()}-${safeFileName(file.name)}`
  const bytes = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage.from("matter-artifacts").upload(storagePath, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) return { error: uploadError.message }

  const { data: artifact, error: artifactError } = await supabase
    .from("evidence_artifacts")
    .insert({
      matter_id: matterId,
      evidence_id: evidenceId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      sha256_hash: createHash("sha256").update(bytes).digest("hex"),
      created_by: user.id,
      replaces_artifact_id: replacesArtifactId,
    })
    .select("id")
    .single()

  if (artifactError || !artifact) {
    await supabase.storage.from("matter-artifacts").remove([storagePath])
    return { error: artifactError?.message ?? "The artifact record could not be saved." }
  }

  if (replacesArtifactId) {
    const { error: replacementError } = await supabase
      .from("evidence_artifacts")
      .update({ lifecycle_status: "superseded" })
      .eq("id", replacesArtifactId)
      .eq("matter_id", matterId)
    if (replacementError) {
      await supabase.from("evidence_artifacts").delete().eq("id", artifact.id).eq("matter_id", matterId)
      await supabase.storage.from("matter-artifacts").remove([storagePath])
      return { error: replacementError.message }
    }
  }

  await logAuditEvent({
    matterId,
    entityType: "evidence",
    entityId: evidenceId,
    action: "artifact_upload",
    summary: replacesArtifactId ? `Uploaded replacement artifact ${file.name}` : `Uploaded artifact ${file.name}`,
    newValue: { artifact_id: artifact.id, file_name: file.name, size_bytes: file.size, replaces_artifact_id: replacesArtifactId },
  })

  revalidatePath(`/matters/${matterId}/evidence/${evidenceId}`)
  return { error: null, artifactId: artifact.id, replacedArtifactId: replacesArtifactId ?? undefined }
}

export async function createEvidenceArtifactDownloadUrl(input: { matterId: string; artifactId: string }) {
  const user = await requireCurrentUser()
  void user
  const supabase = await createClient()
  const { data: artifact, error } = await supabase
    .from("evidence_artifacts")
    .select("storage_path, lifecycle_status")
    .eq("id", input.artifactId)
    .eq("matter_id", input.matterId)
    .single()
  if (error || !artifact) return { ok: false as const, error: "This artifact is no longer available." }
  if (artifact.lifecycle_status === "released") return { ok: false as const, error: "This artifact has been released from retention and is no longer available." }

  const { data: signed, error: signedError } = await supabase.storage.from("matter-artifacts").createSignedUrl(artifact.storage_path, 10 * 60)
  if (signedError || !signed) return { ok: false as const, error: signedError?.message ?? "Could not create a secure download link." }
  return { ok: true as const, url: signed.signedUrl }
}

export async function updateEvidenceArtifactRetention(input: {
  matterId: string
  artifactId: string
  retentionUntil: string | null
  legalHold: boolean
}) {
  const role = await getMatterRole(input.matterId)
  if (!canExcludeEvidence(role)) return { ok: false as const, error: "Your role does not permit retention changes." }

  if (input.retentionUntil && Number.isNaN(Date.parse(input.retentionUntil))) {
    return { ok: false as const, error: "Enter a valid retention date." }
  }

  const supabase = await createClient()
  const { data: artifact } = await supabase
    .from("evidence_artifacts")
    .select("id, evidence_id, lifecycle_status, retention_until, legal_hold")
    .eq("id", input.artifactId)
    .eq("matter_id", input.matterId)
    .maybeSingle()
  if (!artifact) return { ok: false as const, error: "This artifact is no longer available." }
  if (artifact.lifecycle_status === "released") return { ok: false as const, error: "Released artifacts cannot be changed." }

  const { error } = await supabase
    .from("evidence_artifacts")
    .update({ retention_until: input.retentionUntil, legal_hold: input.legalHold })
    .eq("id", input.artifactId)
    .eq("matter_id", input.matterId)
  if (error) return { ok: false as const, error: error.message }

  await logAuditEvent({
    matterId: input.matterId,
    entityType: "evidence",
    entityId: artifact.evidence_id,
    action: "update",
    summary: `Updated artifact retention controls`,
    previousValue: { retention_until: artifact.retention_until, legal_hold: artifact.legal_hold },
    newValue: { retention_until: input.retentionUntil, legal_hold: input.legalHold },
  })

  revalidatePath(`/matters/${input.matterId}/evidence`)
  return { ok: true as const }
}

export async function releaseEvidenceArtifact(input: { matterId: string; artifactId: string }) {
  const role = await getMatterRole(input.matterId)
  if (!canExcludeEvidence(role)) return { ok: false as const, error: "Your role does not permit releasing artifacts." }

  const supabase = await createClient()
  const { data: artifact } = await supabase
    .from("evidence_artifacts")
    .select("evidence_id, lifecycle_status, retention_until, legal_hold")
    .eq("id", input.artifactId)
    .eq("matter_id", input.matterId)
    .maybeSingle()
  if (!artifact) return { ok: false as const, error: "This artifact is no longer available." }
  if (artifact.lifecycle_status === "released") return { ok: false as const, error: "This artifact is already released." }
  if (artifact.legal_hold) return { ok: false as const, error: "Remove the legal hold before releasing this artifact." }
  if (artifact.retention_until && new Date(artifact.retention_until).getTime() > Date.now()) {
    return { ok: false as const, error: "The retention date has not passed yet." }
  }

  const { error } = await supabase
    .from("evidence_artifacts")
    .update({ lifecycle_status: "released" })
    .eq("id", input.artifactId)
    .eq("matter_id", input.matterId)
  if (error) return { ok: false as const, error: error.message }

  await logAuditEvent({
    matterId: input.matterId,
    entityType: "evidence",
    entityId: artifact.evidence_id,
    action: "status_change",
    summary: "Released an evidence artifact from retention",
    newValue: { lifecycle_status: "released" },
  })
  revalidatePath(`/matters/${input.matterId}/evidence`)
  return { ok: true as const }
}

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
