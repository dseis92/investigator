import type { Metadata } from "next"

import { SettingsCenter } from "@/components/matterpilot/settings-center"
import { createClient } from "@/lib/supabase/server"
import { firmSettingsSchema, type SharedFirm } from "@/lib/matterpilot/firm-settings"

export const metadata: Metadata = {
  title: "MatterPilot Settings",
  description: "Configure MatterPilot for your firm, team, and workflow.",
}

export default async function MatterPilotSettingsPage({ searchParams }: { searchParams: Promise<{ firmId?: string; section?: string; newFirm?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) return null

  const { data: preferenceRow } = await supabase.from("user_preferences").select("preferences").eq("user_id", data.user.id).maybeSingle()
  const initialPreferences = preferenceRow?.preferences && typeof preferenceRow.preferences === "object" && !Array.isArray(preferenceRow.preferences)
    ? Object.fromEntries(Object.entries(preferenceRow.preferences)) as Record<string, unknown>
    : {}

  const { data: firms } = await supabase.from("firms").select("*").order("name")
  const selected = params.newFirm === "1" || params.firmId === "" ? null : firms?.find((firm) => firm.id === params.firmId) ?? (params.firmId ? null : firms?.[0])
  const parsedFirm = selected ? firmSettingsSchema.safeParse(selected) : null
  const firm: SharedFirm | null = selected && parsedFirm?.success ? { ...parsedFirm.data, id: selected.id, updated_at: selected.updated_at } : null
  const { data: canEdit } = firm ? await supabase.rpc("is_firm_admin", { p_firm_id: firm.id }) : { data: true }
  const { data: memberships } = await supabase.from("matter_members").select("matter_id").eq("user_id", data.user.id).in("role", ["attorney", "admin"])
  const ids = memberships?.map((member) => member.matter_id) ?? []
  const { data: eligibleMatters } = ids.length ? await supabase.from("matters").select("id,name,matter_number").is("firm_id", null).in("id", ids).order("name").limit(50) : { data: [] }
  return <SettingsCenter userEmail={data.user.email ?? ""} initialPreferences={initialPreferences} initialSection={params.section === "firm" ? "firm" : "profile"} sharedFirmProps={{ firms: firms?.map(({ id, name }) => ({ id, name })) ?? [], firm, canEdit: Boolean(canEdit), eligibleMatters: eligibleMatters ?? [] }} />
}
