"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { logAuditEvent } from "@/lib/audit/log-audit-event"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error: string | null }

export async function createSubject(matterId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const subjectType = String(formData.get("subject_type") ?? "")
  const displayName = String(formData.get("display_name") ?? "").trim()
  const summary = String(formData.get("summary") ?? "").trim() || null

  if (!subjectType || !displayName) return { error: "Subject type and name are required." }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("subjects")
    .insert({ matter_id: matterId, subject_type: subjectType, display_name: displayName, summary, created_by: user.id })
    .select("id")
    .single()

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "subject",
    entityId: data.id,
    action: "create",
    summary: `Added subject: ${displayName}`,
  })

  revalidatePath(`/matters/${matterId}/subjects`)
  revalidatePath(`/matters/${matterId}`)
  redirect(`/matters/${matterId}/subjects/${data.id}`)
}

export async function addEntityAttribute(
  matterId: string,
  subjectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const attributeKey = String(formData.get("attribute_key") ?? "").trim()
  const attributeValue = String(formData.get("attribute_value") ?? "").trim()
  const status = String(formData.get("status") ?? "reported")
  const evidenceId = String(formData.get("evidence_id") ?? "") || null

  if (!attributeKey || !attributeValue) return { error: "Attribute name and value are required." }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("entity_attributes")
    .insert({
      matter_id: matterId,
      subject_id: subjectId,
      attribute_key: attributeKey,
      attribute_value: attributeValue,
      status,
      evidence_id: evidenceId,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  await logAuditEvent({
    matterId,
    entityType: "entity_attribute",
    entityId: data.id,
    action: "create",
    summary: `Added attribute ${attributeKey}: ${attributeValue}`,
  })

  revalidatePath(`/matters/${matterId}/subjects/${subjectId}`)
  return { error: null }
}

/**
 * Corrections to an attribute never edit the row in place: a new row is
 * inserted with the corrected value, and the old row is pointed at it via
 * superseded_by so the prior value stays visible in history.
 */
export async function supersedeAttribute(
  matterId: string,
  subjectId: string,
  previousAttributeId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const attributeKey = String(formData.get("attribute_key") ?? "").trim()
  const attributeValue = String(formData.get("attribute_value") ?? "").trim()
  const status = String(formData.get("status") ?? "reported")
  const evidenceId = String(formData.get("evidence_id") ?? "") || null

  if (!attributeKey || !attributeValue) return { error: "Attribute name and value are required." }

  const user = await requireCurrentUser()
  const supabase = await createClient()

  const { data: newAttribute, error: insertError } = await supabase
    .from("entity_attributes")
    .insert({
      matter_id: matterId,
      subject_id: subjectId,
      attribute_key: attributeKey,
      attribute_value: attributeValue,
      status,
      evidence_id: evidenceId,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (insertError) return { error: insertError.message }

  const { error: updateError } = await supabase
    .from("entity_attributes")
    .update({ status: "superseded", superseded_by: newAttribute.id })
    .eq("id", previousAttributeId)

  if (updateError) return { error: updateError.message }

  await logAuditEvent({
    matterId,
    entityType: "entity_attribute",
    entityId: newAttribute.id,
    action: "supersede",
    summary: `Superseded attribute ${attributeKey} with a corrected value`,
    previousValue: { attribute_id: previousAttributeId },
  })

  revalidatePath(`/matters/${matterId}/subjects/${subjectId}`)
  return { error: null }
}
