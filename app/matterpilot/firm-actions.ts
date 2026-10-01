"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { firmSettingsSchema } from "@/lib/matterpilot/firm-settings"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/types"

const inputSchema = z.object({ firmId: z.string().uuid().optional(), updatedAt: z.string().optional(), settings: firmSettingsSchema, matterIds: z.array(z.string().uuid()).max(50).default([]) })

export async function saveFirmSettingsAction(input: z.input<typeof inputSchema>) {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the firm settings." }
  await requireCurrentUser()
  const supabase = await createClient()
  let firmId = parsed.data.firmId
  if (firmId) {
    const { data: allowed, error: roleError } = await supabase.rpc("is_firm_admin", { p_firm_id: firmId })
    if (roleError || !allowed) return { ok: false as const, error: "Only a firm administrator can save shared settings." }
    const query = supabase.from("firms").update(parsed.data.settings).eq("id", firmId)
    if (parsed.data.updatedAt) query.eq("updated_at", parsed.data.updatedAt)
    const { data, error } = await query.select("id").maybeSingle()
    if (error) return { ok: false as const, error: error.message }
    if (!data) return { ok: false as const, error: "Settings changed in another session. Reload before saving." }
  } else {
    const { data, error } = await supabase.rpc("create_firm", { p_settings: parsed.data.settings as unknown as Json, p_matter_ids: parsed.data.matterIds })
    if (error || !data) return { ok: false as const, error: error?.message ?? "Unable to create the firm." }
    firmId = data
  }
  revalidatePath("/matterpilot/settings")
  revalidatePath("/matters")
  revalidatePath("/matterpilot")
  return { ok: true as const, firmId }
}

export async function connectFirmMattersAction(input: { firmId: string; matterIds: string[] }) {
  const parsed = z.object({ firmId: z.string().uuid(), matterIds: z.array(z.string().uuid()).min(1).max(50) }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: "Choose the matters to connect." }
  await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("connect_firm_matters", { p_firm_id: parsed.data.firmId, p_matter_ids: parsed.data.matterIds })
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/matterpilot/settings")
  revalidatePath("/matterpilot")
  return { ok: true as const }
}
