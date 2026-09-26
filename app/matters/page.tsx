import type { Metadata } from "next"

import { IntelligenceDashboard, type IntelligenceMatter } from "@/components/matters/intelligence-dashboard"
import { parseMatterStarterTemplates } from "@/lib/matterpilot/customizations"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Matters" }

export default async function MattersPage() {
  const supabase = await createClient()
  const { data: matters } = await supabase
    .from("matters")
    .select("id, matter_number, name, case_mode, status, jurisdiction, next_deadline_at")
    .order("created_at", { ascending: false })

  const { data: userData } = await supabase.auth.getUser()
  const { data: preferenceRow } = userData.user
    ? await supabase.from("user_preferences").select("preferences").eq("user_id", userData.user.id).maybeSingle()
    : { data: null }
  const preferences = preferenceRow?.preferences && typeof preferenceRow.preferences === "object" && !Array.isArray(preferenceRow.preferences)
    ? preferenceRow.preferences as Record<string, unknown>
    : {}
  const matterTemplates = parseMatterStarterTemplates(preferences.matterTemplates)

  return <IntelligenceDashboard matters={(matters ?? []) as IntelligenceMatter[]} matterTemplates={matterTemplates} />
}
