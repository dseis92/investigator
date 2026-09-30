"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"
import { logAuditEvent } from "@/lib/audit/log-audit-event"

const schema = z.object({
  matterId: z.string().uuid(),
  operation: z.enum(["prepare", "review_conflicts", "activate"]),
  note: z.string().trim().max(2000).optional(),
})

export async function manageMatterIntakeAction(input: z.input<typeof schema>) {
  const parsed = schema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false as const,
      error: "Check the intake request and try again.",
    }
  await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("manage_matter_intake", {
    p_matter_id: parsed.data.matterId,
    p_operation: parsed.data.operation,
    p_note: parsed.data.note,
  })
  if (error) return { ok: false as const, error: error.message }
  revalidatePath(`/matters/${parsed.data.matterId}`)
  revalidatePath("/matters")
  revalidatePath("/matterpilot")
  return { ok: true as const }
}

const clientSchema = z.object({
  matterId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  email: z.union([z.string().trim().email(), z.literal("")]),
  phone: z.string().trim().max(80),
})

export async function saveIntakeClientAction(
  input: z.input<typeof clientSchema>
) {
  const parsed = clientSchema.safeParse(input)
  if (!parsed.success)
    return {
      ok: false as const,
      error: "Add a client name and check the email address.",
    }
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data: member } = await supabase
    .from("matter_members")
    .select("role")
    .eq("matter_id", parsed.data.matterId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!member || !["attorney", "admin"].includes(member.role))
    return {
      ok: false as const,
      error: "An attorney or administrator must update the intake client.",
    }
  const { data, error } = await supabase
    .from("matters")
    .update({
      client_name: parsed.data.name,
      client_email: parsed.data.email || null,
      client_phone: parsed.data.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.matterId)
    .select("id")
    .single()
  if (error || !data)
    return {
      ok: false as const,
      error: error?.message ?? "Unable to save this client.",
    }
  await logAuditEvent({
    matterId: data.id,
    entityType: "matter",
    entityId: data.id,
    action: "update",
    summary: "Updated intake client identity",
  })
  revalidatePath(`/matters/${data.id}`)
  return { ok: true as const }
}
