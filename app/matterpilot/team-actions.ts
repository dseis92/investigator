"use server"

import { createHash, randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { headers } from "next/headers"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"

const roleSchema = z.enum(["admin", "attorney", "investigator", "paralegal", "litigation_support", "expert"])

export async function createTeamInvitationAction(input: { firmId: string; email: string; memberRole: string }) {
  const parsed = z.object({ firmId: z.string().uuid(), email: z.string().trim().email(), memberRole: roleSchema }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: "Enter a valid email and choose a team role." }
  const currentUser = await requireCurrentUser()
  const token = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_firm_invitation", { p_firm_id: parsed.data.firmId, p_email: parsed.data.email.toLowerCase(), p_member_role: parsed.data.memberRole, p_token_hash: tokenHash })
  if (error || !data) return { ok: false as const, error: error?.message ?? "Unable to create the invitation." }
  const requestHeaders = await headers()
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://matterpilot.app"
  const inviteLink = `${origin}/matterpilot/settings?section=team&invite=${token}`
  const { error: emailError } = await supabase.from("firm_email_communications").insert({
    firm_id: parsed.data.firmId,
    invitation_id: data.id,
    recipient: parsed.data.email.toLowerCase(),
    subject: "You have been invited to MatterPilot",
    body: `You have been invited to join a MatterPilot firm workspace as ${parsed.data.memberRole.replaceAll("_", " ")}.

Sign in with this email address, then use the secure invitation link below to join the workspace:
${inviteLink}

This invitation expires in seven days. If you were not expecting it, you can ignore this message.`,
    created_by: currentUser.id,
  })
  await supabase.rpc("log_firm_security_event", { p_firm_id: parsed.data.firmId, p_event_type: "invitation_created", p_details: { email: parsed.data.email.toLowerCase(), member_role: parsed.data.memberRole } })
  revalidatePath("/matterpilot/settings")
  return { ok: true as const, token, expiresAt: data.expires_at, invitationId: data.id, emailQueued: !emailError }
}

export async function revokeTeamInvitationAction(invitationId: string) {
  if (!z.string().uuid().safeParse(invitationId).success) return { ok: false as const, error: "Invalid invitation." }
  await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("revoke_firm_invitation", { p_invitation_id: invitationId })
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/matterpilot/settings")
  return { ok: true as const }
}

export async function updateTeamMemberAction(input: { firmId: string; userId: string; role: string; memberRole: string }) {
  const parsed = z.object({ firmId: z.string().uuid(), userId: z.string().uuid(), role: z.enum(["admin", "member"]), memberRole: roleSchema.exclude(["admin"]) }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: "Choose valid team permissions." }
  await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("update_firm_member", { p_firm_id: parsed.data.firmId, p_user_id: parsed.data.userId, p_role: parsed.data.role, p_member_role: parsed.data.memberRole })
  if (error) return { ok: false as const, error: error.message }
  await supabase.rpc("log_firm_security_event", { p_firm_id: parsed.data.firmId, p_event_type: "member_role_changed", p_target_user_id: parsed.data.userId, p_details: { role: parsed.data.role, member_role: parsed.data.memberRole } })
  revalidatePath("/matterpilot/settings")
  return { ok: true as const }
}

export async function removeTeamMemberAction(input: { firmId: string; userId: string }) {
  const parsed = z.object({ firmId: z.string().uuid(), userId: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: "Invalid team member." }
  await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("remove_firm_member", { p_firm_id: parsed.data.firmId, p_user_id: parsed.data.userId })
  if (error) return { ok: false as const, error: error.message }
  await supabase.rpc("log_firm_security_event", { p_firm_id: parsed.data.firmId, p_event_type: "member_removed", p_target_user_id: parsed.data.userId })
  revalidatePath("/matterpilot/settings")
  return { ok: true as const }
}

export async function setTeamMemberStatusAction(input: { firmId: string; userId: string; status: "active" | "suspended" }) {
  const parsed = z.object({ firmId: z.string().uuid(), userId: z.string().uuid(), status: z.enum(["active", "suspended"]) }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: "Invalid team member status." }
  await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("set_firm_member_status", { p_firm_id: parsed.data.firmId, p_user_id: parsed.data.userId, p_status: parsed.data.status })
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/matterpilot/settings")
  return { ok: true as const }
}

export async function acceptTeamInvitationAction(token: string) {
  if (!token || token.length < 20) return { ok: false as const, error: "Invalid invitation link." }
  await requireCurrentUser()
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("accept_firm_invitation", { p_token_hash: tokenHash })
  if (error || !data) return { ok: false as const, error: error?.message ?? "Unable to accept this invitation." }
  revalidatePath("/matterpilot")
  revalidatePath("/matterpilot/settings")
  return { ok: true as const, firmId: data }
}
