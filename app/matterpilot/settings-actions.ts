"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/types"

const preferenceValueSchema = z.union([
  z.string().trim().max(500),
  z.boolean(),
  z.array(z.unknown()).max(50),
  z.record(z.string(), z.unknown()),
])
const preferencesSchema = z.record(z.string().trim().min(1).max(80), preferenceValueSchema).refine((preferences) => Object.keys(preferences).length <= 100, "Too many preferences.")

export type SettingsActionResult = { ok: true } | { ok: false; error: string }

export async function saveUserPreferencesAction(input: Record<string, unknown>): Promise<SettingsActionResult> {
  const parsed = preferencesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "One or more settings could not be saved." }

  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.from("user_preferences").upsert({
    user_id: user.id,
    preferences: parsed.data as unknown as Json,
    updated_at: new Date().toISOString(),
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/matterpilot/settings")
  return { ok: true }
}
