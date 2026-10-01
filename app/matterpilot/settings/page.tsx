import type { Metadata } from "next"

import { SettingsCenter } from "@/components/matterpilot/settings-center"
import { createClient } from "@/lib/supabase/server"
import { firmSettingsSchema, type SharedFirm } from "@/lib/matterpilot/firm-settings"
import type { TeamSettingsProps } from "@/components/matterpilot/team-settings"

export const metadata: Metadata = {
  title: "MatterPilot Settings",
  description: "Configure MatterPilot for your firm, team, and workflow.",
}

export default async function MatterPilotSettingsPage({ searchParams }: { searchParams: Promise<{ firmId?: string; section?: string; newFirm?: string; invite?: string }> }) {
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
  if (firm) await supabase.rpc("touch_firm_member_activity", { p_firm_id: firm.id })
  const { data: memberRows } = firm ? await supabase.from("firm_members").select("user_id,role,member_role,status,last_active_at,profiles(full_name,email)").eq("firm_id", firm.id).order("created_at") : { data: [] }
  const { data: invitationRows } = firm && canEdit ? await supabase.from("firm_invitations").select("id,email,member_role,expires_at").eq("firm_id", firm.id).is("accepted_at", null).is("revoked_at", null).order("created_at", { ascending: false }) : { data: [] }
  const { data: securityEventRows } = firm && canEdit ? await supabase.from("firm_security_events").select("id,event_type,target_user_id,details,created_at").eq("firm_id", firm.id).order("created_at", { ascending: false }).limit(30) : { data: [] }
  const { data: memberships } = await supabase.from("matter_members").select("matter_id").eq("user_id", data.user.id).in("role", ["attorney", "admin"])
  const ids = memberships?.map((member) => member.matter_id) ?? []
  const { data: eligibleMatters } = ids.length ? await supabase.from("matters").select("id,name,matter_number").is("firm_id", null).in("id", ids).order("name").limit(50) : { data: [] }
  const teamMembers: TeamSettingsProps["members"] = (memberRows ?? []).map((row) => { const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles; return { userId: row.user_id, name: profile?.full_name ?? profile?.email ?? "Team member", email: profile?.email ?? "", role: row.role as "admin" | "member", memberRole: row.member_role, status: row.status as "active" | "suspended", lastActiveAt: row.last_active_at } })
  const teamInvitations: TeamSettingsProps["invitations"] = (invitationRows ?? []).map((row) => ({ id: row.id, email: row.email, memberRole: row.member_role, expiresAt: row.expires_at }))
  return <SettingsCenter userEmail={data.user.email ?? ""} initialPreferences={initialPreferences} initialSection={params.section === "firm" ? "firm" : params.section === "team" ? "team" : "profile"} sharedFirmProps={{ firms: firms?.map(({ id, name }) => ({ id, name })) ?? [], firm, canEdit: Boolean(canEdit), eligibleMatters: eligibleMatters ?? [] }} teamProps={{ firmId: firm?.id ?? null, canEdit: Boolean(canEdit), members: teamMembers, invitations: teamInvitations, securityEvents: (securityEventRows ?? []).map((row) => ({ id: row.id, eventType: row.event_type, targetUserId: row.target_user_id, details: row.details, createdAt: row.created_at })), inviteToken: params.invite ?? "" }} />
}
