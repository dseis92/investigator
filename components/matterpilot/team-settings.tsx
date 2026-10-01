"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Loader2, ShieldCheck, UserMinus, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { acceptTeamInvitationAction, createTeamInvitationAction, removeTeamMemberAction, revokeTeamInvitationAction, updateTeamMemberAction } from "@/app/matterpilot/team-actions"

export type TeamSettingsProps = {
  firmId: string | null
  canEdit: boolean
  members: { userId: string; name: string; email: string; role: "admin" | "member"; memberRole: string }[]
  invitations: { id: string; email: string; memberRole: string; expiresAt: string }[]
  inviteToken?: string
}

const roles = [{ value: "attorney", label: "Attorney" }, { value: "investigator", label: "Investigator" }, { value: "paralegal", label: "Paralegal" }, { value: "litigation_support", label: "Litigation support" }, { value: "expert", label: "Expert" }]

export function TeamSettingsPanel({ firmId, canEdit, members: initialMembers, invitations: initialInvitations, inviteToken = "" }: TeamSettingsProps) {
  const [members, setMembers] = useState(initialMembers)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [email, setEmail] = useState("")
  const [memberRole, setMemberRole] = useState("attorney")
  const [inviteLink, setInviteLink] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  function acceptInvite() {
    startTransition(async () => { const result = await acceptTeamInvitationAction(inviteToken); if (!result.ok) setError(result.error); else { setMessage("Invitation accepted. Refreshing your firm access…"); router.push(`/matterpilot/settings?section=team&firmId=${result.firmId}`) } })
  }
  function invite() {
    if (!firmId) { setError("Create a firm workspace before inviting a team member."); return }
    setError(""); setMessage("")
    startTransition(async () => {
      const result = await createTeamInvitationAction({ firmId, email, memberRole })
      if (!result.ok) { setError(result.error); return }
      setInviteLink(`${window.location.origin}/matterpilot/settings?section=team&invite=${result.token}`)
      setEmail("")
      setInvitations((current) => [{ id: result.invitationId, email, memberRole, expiresAt: result.expiresAt }, ...current])
      setMessage(result.emailQueued ? "Invitation created and queued for delivery." : "Invitation created. Copy the secure link and send it to the invited person.")
    })
  }
  function update(member: TeamSettingsProps["members"][number], role: "admin" | "member", nextMemberRole: string) {
    if (!firmId) return
    startTransition(async () => {
      const result = await updateTeamMemberAction({ firmId, userId: member.userId, role, memberRole: nextMemberRole })
      if (!result.ok) { setError(result.error); return }
      setMembers((current) => current.map((item) => item.userId === member.userId ? { ...item, role, memberRole: nextMemberRole } : item)); setMessage("Team permissions updated.")
    })
  }
  return <div className="space-y-6">
    {inviteToken ? <section className="rounded-2xl border border-[#dfc7b7] bg-[#fffaf6] p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><ShieldCheck className="size-5 text-[#b65f3a]" /><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b65f3a]">Team invitation</p><h3 className="mt-1 font-serif text-2xl text-[#23313d]">Join this firm workspace</h3><p className="mt-2 text-xs leading-5 text-[#6f4f3c]">Accepting adds your account to the shared firm directory. Matter access is still assigned separately.</p></div></div><Button className="mt-5" onClick={acceptInvite} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Check />} Accept invitation</Button></section> : null}
    {!firmId ? <div className="rounded-2xl border border-dashed border-[#d8c7bb] bg-[#fffaf6] p-6 text-sm leading-6 text-[#6f4f3c]">Create a firm workspace first. Team invitations and roles belong to a shared firm, while matter access remains assigned separately.</div> : null}
    <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 size-5 text-[#b65f3a]" /><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b65f3a]">Team directory</p><h3 className="mt-1 font-serif text-2xl text-[#23313d]">People in this workspace</h3><p className="mt-2 text-xs leading-5 text-[#63747a]">Firm membership controls shared settings and firm defaults. It does not automatically grant access to every matter.</p></div></div>
      <div className="mt-6 space-y-3">{members.length ? members.map((member) => <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-4" key={member.userId}><span className="flex size-9 items-center justify-center rounded-full bg-[#ead9c4] text-sm font-semibold text-[#6f4f3c]">{member.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#35433e]">{member.name}</p><p className="truncate text-xs text-[#8b8d88]">{member.email}</p></div>{canEdit ? <><select value={member.role} onChange={(event) => update(member, event.target.value as "admin" | "member", member.memberRole)} className="rounded-lg border border-[#ded9d0] bg-white p-2 text-xs"><option value="admin">Administrator</option><option value="member">Member</option></select><select value={member.memberRole} onChange={(event) => update(member, member.role, event.target.value)} className="rounded-lg border border-[#ded9d0] bg-white p-2 text-xs">{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><Button variant="outline" size="sm" onClick={() => { if (!firmId) return; startTransition(async () => { const result = await removeTeamMemberAction({ firmId, userId: member.userId }); if (!result.ok) setError(result.error); else setMembers((current) => current.filter((item) => item.userId !== member.userId)) }) }}><UserMinus /> Remove</Button></> : <span className="rounded-full bg-[#f1eee8] px-2.5 py-1 text-[10px] font-bold text-[#737872]">{member.role === "admin" ? "Administrator" : roles.find((role) => role.value === member.memberRole)?.label ?? "Member"}</span>}</div>) : <p className="rounded-xl border border-dashed border-[#ded9d0] p-5 text-sm text-[#8b8d88]">No team members yet.</p>}</div>
    </section>
    {canEdit && firmId ? <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-7"><div className="flex items-center gap-2"><UserPlus className="size-4 text-[#b65f3a]" /><h3 className="font-serif text-2xl text-[#23313d]">Invite someone</h3></div><p className="mt-2 text-xs leading-5 text-[#63747a]">The secure invitation expires in seven days. The invited person must sign in with the exact email address used here.</p><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_190px_auto]"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@firm.com" className="rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-sm" /><select value={memberRole} onChange={(event) => setMemberRole(event.target.value)} className="rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-sm">{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><Button onClick={invite} disabled={pending || !email}>{pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Create invite</Button></div>{inviteLink && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#dfc7b7] bg-[#fffaf6] p-3"><input readOnly value={inviteLink} className="min-w-0 flex-1 bg-transparent text-xs text-[#6f4f3c] outline-none" /><Button size="sm" onClick={() => void navigator.clipboard.writeText(inviteLink)}><Copy /> Copy link</Button></div>}</section> : null}
    {canEdit && invitations.length ? <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-7"><h3 className="font-serif text-2xl text-[#23313d]">Pending invitations</h3><div className="mt-4 space-y-2">{invitations.map((invitation) => <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-3 text-xs" key={invitation.id}><span className="min-w-0 flex-1 truncate font-semibold">{invitation.email}</span><span className="text-[#8b8d88]">{roles.find((role) => role.value === invitation.memberRole)?.label ?? "Administrator"} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</span><Button variant="outline" size="sm" onClick={() => startTransition(async () => { const result = await revokeTeamInvitationAction(invitation.id); if (!result.ok) setError(result.error); else setInvitations((current) => current.filter((item) => item.id !== invitation.id)) })}>Revoke</Button></div>)}</div></section> : null}
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
  </div>
}
