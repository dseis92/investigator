"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"

const onboardingItemStatusSchema = z.object({
  matterId: z.string().uuid(),
  itemId: z.string().uuid(),
  status: z.enum(["open", "completed", "waived"]),
})

type OnboardingActionResult = { ok: true } | { ok: false; error: string }

export async function updateMatterOnboardingItemAction(input: z.input<typeof onboardingItemStatusSchema>): Promise<OnboardingActionResult> {
  const parsed = onboardingItemStatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That onboarding item is no longer available." }

  await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from("matter_onboarding_items")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.itemId)
    .eq("matter_id", parsed.data.matterId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/matters/${parsed.data.matterId}`)
  return { ok: true }
}
