import type { Metadata } from "next"

import { SettingsCenter } from "@/components/matterpilot/settings-center"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "MatterPilot Settings",
  description: "Configure MatterPilot for your firm, team, and workflow.",
}

export default async function MatterPilotSettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) return null

  const { data: preferenceRow } = await supabase.from("user_preferences").select("preferences").eq("user_id", data.user.id).maybeSingle()
  const initialPreferences = preferenceRow?.preferences && typeof preferenceRow.preferences === "object" && !Array.isArray(preferenceRow.preferences)
    ? Object.fromEntries(Object.entries(preferenceRow.preferences)) as Record<string, unknown>
    : {}

  return <SettingsCenter userEmail={data.user.email ?? ""} initialPreferences={initialPreferences} />
}
