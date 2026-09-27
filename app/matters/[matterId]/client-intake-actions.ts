"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"

type ClientIntakeResult = { ok: true; status: "clear" | "possible_conflict" | "waived"; note: string } | { ok: false; error: string }

async function findMatches(matterId: string, clientName: string) {
  const supabase = await createClient()
  const [{ data: contactMatches }, { data: subjectMatches }] = await Promise.all([
    supabase.from("matter_contacts").select("matter_id, display_name, contact_type").neq("matter_id", matterId).ilike("display_name", clientName).limit(20),
    supabase.from("subjects").select("matter_id, display_name, subject_type").neq("matter_id", matterId).ilike("display_name", clientName).limit(20),
  ])
  const matches = [...(contactMatches ?? []).map((match) => ({ matterId: match.matter_id, label: match.display_name, kind: "contact" })), ...(subjectMatches ?? []).map((match) => ({ matterId: match.matter_id, label: match.display_name, kind: match.subject_type }))]
  const relatedMatterIds = [...new Set(matches.map((match) => match.matterId))]
  const { data: relatedMatters } = relatedMatterIds.length ? await supabase.from("matters").select("id, name, matter_number").in("id", relatedMatterIds) : { data: [] }
  const matterNames = new Map((relatedMatters ?? []).map((matter) => [matter.id, `${matter.name} (${matter.matter_number})`]))
  const note = matches.length
    ? `Possible match${matches.length === 1 ? "" : "es"}: ${matches.slice(0, 5).map((match) => `${match.label} in ${matterNames.get(match.matterId) ?? "another accessible matter"}`).join("; ")}. Review before confirming representation.`
    : "No matching contact or subject was found in the matters currently accessible to you. Review remains a human responsibility."
  return { status: matches.length ? "possible_conflict" as const : "clear" as const, note }
}

export async function rerunMatterConflictCheckAction(input: { matterId: string }): Promise<ClientIntakeResult> {
  const parsed = z.object({ matterId: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: "That matter could not be checked." }
  await requireCurrentUser()
  const supabase = await createClient()
  const { data: matter } = await supabase.from("matters").select("id, client_name").eq("id", parsed.data.matterId).maybeSingle()
  if (!matter?.client_name) return { ok: false, error: "Add a client name before running a conflict check." }
  const result = await findMatches(parsed.data.matterId, matter.client_name)
  const { error } = await supabase.from("matters").update({ conflict_status: result.status, conflict_note: result.note }).eq("id", parsed.data.matterId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/matters/${parsed.data.matterId}`)
  return { ok: true, ...result }
}

const conflictDecisionSchema = z.object({
  matterId: z.string().uuid(),
  status: z.enum(["clear", "possible_conflict", "waived"]),
  note: z.string().trim().max(2000).optional(),
})

export async function saveMatterConflictDecisionAction(input: z.input<typeof conflictDecisionSchema>): Promise<ClientIntakeResult> {
  const parsed = conflictDecisionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Choose a conflict decision before saving." }
  await requireCurrentUser()
  const supabase = await createClient()
  const note = parsed.data.note?.trim() || (parsed.data.status === "waived" ? "Conflict review waived by the responsible attorney." : "Conflict decision recorded by the matter team.")
  const { error } = await supabase.from("matters").update({ conflict_status: parsed.data.status, conflict_note: note }).eq("id", parsed.data.matterId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/matters/${parsed.data.matterId}`)
  return { ok: true, status: parsed.data.status, note }
}
