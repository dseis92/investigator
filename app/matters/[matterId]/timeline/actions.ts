"use server"

import { revalidatePath } from "next/cache"

import { logAuditEvent } from "@/lib/audit/log-audit-event"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error: string | null }

export async function createEvent(matterId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim()
  const eventStart = String(formData.get("event_start") ?? "")
  const eventEnd = String(formData.get("event_end") ?? "") || null
  const description = String(formData.get("description") ?? "").trim() || null
  const confidence = String(formData.get("confidence") ?? "reported")
  const favorability = String(formData.get("favorability") ?? "neutral")
  const category = String(formData.get("category") ?? "") || null
  const primaryEvidenceId = String(formData.get("primary_evidence_id") ?? "") || null

  if (!title || !eventStart) return { error: "Title and event start are required." }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .insert({
      matter_id: matterId,
      title,
      event_start: eventStart,
      event_end: eventEnd,
      description,
      confidence,
      favorability,
      category,
      primary_evidence_id: primaryEvidenceId,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  if (primaryEvidenceId) {
    await supabase.from("evidence_links").insert({
      matter_id: matterId,
      evidence_id: primaryEvidenceId,
      event_id: data.id,
      relationship: "mentions",
      created_by: user.id,
    })
  }

  await logAuditEvent({
    matterId,
    entityType: "event",
    entityId: data.id,
    action: "create",
    summary: `Added timeline event: ${title}`,
  })

  revalidatePath(`/matters/${matterId}/timeline`)
  return { error: null }
}
