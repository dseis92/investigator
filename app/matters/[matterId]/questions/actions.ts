"use server"

import { revalidatePath } from "next/cache"

import { logAuditEvent } from "@/lib/audit/log-audit-event"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error: string | null }

export async function createQuestion(matterId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const prompt = String(formData.get("prompt") ?? "").trim()
  const priority = String(formData.get("priority") ?? "medium")
  if (!prompt) return { error: "Question text is required." }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("questions")
    .insert({ matter_id: matterId, prompt, priority, created_by: user.id })
    .select("id")
    .single()

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "question",
    entityId: data.id,
    action: "create",
    summary: `Added question: ${prompt}`,
  })

  revalidatePath(`/matters/${matterId}/questions`)
  revalidatePath(`/matters/${matterId}`)
  return { error: null }
}

export async function updateQuestionStatus(matterId: string, questionId: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("questions").update({ status }).eq("id", questionId)
  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "question",
    entityId: questionId,
    action: "status_change",
    summary: `Question status changed to ${status}`,
  })

  revalidatePath(`/matters/${matterId}/questions`)
  return { error: null }
}

export async function createProposition(
  matterId: string,
  questionId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const statement = String(formData.get("statement") ?? "").trim()
  const assumptions = String(formData.get("assumptions") ?? "").trim() || null
  if (!statement) return { error: "Proposition statement is required." }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("propositions")
    .insert({ matter_id: matterId, question_id: questionId, statement, assumptions, created_by: user.id })
    .select("id")
    .single()

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "proposition",
    entityId: data.id,
    action: "create",
    summary: `Added proposition: ${statement}`,
  })

  revalidatePath(`/matters/${matterId}/questions`)
  revalidatePath(`/matters/${matterId}`)
  return { error: null }
}

export async function linkEvidenceToProposition(
  matterId: string,
  propositionId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const evidenceId = String(formData.get("evidence_id") ?? "")
  const relationship = String(formData.get("relationship") ?? "supports")
  if (!evidenceId) return { error: "Select an evidence item." }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.from("evidence_links").insert({
    matter_id: matterId,
    evidence_id: evidenceId,
    proposition_id: propositionId,
    relationship,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "evidence_link",
    entityId: propositionId,
    action: "create",
    summary: `Linked evidence to proposition (${relationship})`,
  })

  revalidatePath(`/matters/${matterId}/questions`)
  return { error: null }
}

export async function removeEvidenceLink(matterId: string, linkId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("evidence_links").delete().eq("id", linkId)
  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "evidence_link",
    entityId: linkId,
    action: "delete",
    summary: "Removed an evidence link",
  })

  revalidatePath(`/matters/${matterId}/questions`)
  return { error: null }
}
