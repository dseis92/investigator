"use client"

import { AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, Loader2, RefreshCw, ShieldCheck, UserRound } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { rerunMatterConflictCheckAction, saveMatterConflictDecisionAction } from "@/app/matters/[matterId]/client-intake-actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ClientIntakePanelProps = {
  matterId: string
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
  conflictStatus: string
  conflictNote: string | null
  engagementStatus: string
}

function statusLabel(status: string) {
  return status === "possible_conflict" ? "Possible conflict" : status === "not_started" ? "Not started" : status === "waived" ? "Waived" : status === "clear" ? "Clear" : "Pending"
}

export function ClientIntakePanel({ matterId, clientName, clientEmail, clientPhone, conflictStatus, conflictNote, engagementStatus }: ClientIntakePanelProps) {
  const [status, setStatus] = useState(conflictStatus)
  const [note, setNote] = useState(conflictNote ?? "")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState("")
  const [isPending, startTransition] = useTransition()

  function rerun() {
    setError("")
    setSaving("check")
    startTransition(async () => {
      const result = await rerunMatterConflictCheckAction({ matterId })
      setSaving("")
      if (!result.ok) {
        setError(result.error)
        return
      }
      setStatus(result.status)
      setNote(result.note)
    })
  }

  function decide(nextStatus: "clear" | "waived") {
    setError("")
    setSaving(nextStatus)
    startTransition(async () => {
      const result = await saveMatterConflictDecisionAction({ matterId, status: nextStatus, note })
      setSaving("")
      if (!result.ok) {
        setError(result.error)
        return
      }
      setStatus(result.status)
      setNote(result.note)
    })
  }

  if (!clientName) return <section className="rounded-2xl border border-[#d8e1e4] bg-[#f7fbfc] p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><UserRound className="size-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#385367]">Client intake</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#23313d]">Add the client when you are ready</h2><p className="mt-2 max-w-xl text-xs leading-5 text-[#63747a]">Client identity, conflict review, and the secure preparation packet belong together. Add the client from the MatterPilot contact desk to start this workflow.</p><Link href="/matterpilot#contacts" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#385367] hover:underline">Open contact desk <ExternalLink className="size-3.5" /></Link></div></div></section>

  const possible = status === "possible_conflict"
  const clear = status === "clear" || status === "waived"
  return <section className={cn("rounded-2xl border shadow-sm", possible ? "border-amber-200 bg-amber-50/70" : "border-[#d8e1e4] bg-[#f7fbfc]")}>
    <div className="flex flex-col gap-4 border-b border-current/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7"><div><div className="flex items-center gap-2"><UserRound className={cn("size-4", possible ? "text-amber-700" : "text-[#385367]")} /><p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", possible ? "text-amber-700" : "text-[#385367]")}>Client intake & conflicts</p></div><h2 className="mt-1 font-serif text-2xl font-semibold text-[#23313d]">{clientName}</h2><p className="mt-1 text-xs text-[#63747a]">{clientEmail ?? "No email recorded"}{clientPhone ? ` · ${clientPhone}` : ""}</p></div><span className={cn("inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-[10px] font-bold", possible ? "bg-amber-100 text-amber-800" : clear ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>{possible ? <AlertTriangle className="size-3.5" /> : clear ? <CheckCircle2 className="size-3.5" /> : <ShieldCheck className="size-3.5" />}{statusLabel(status)}</span></div>
    <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px]"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#737872]">Conflict review note</p><p className="mt-2 rounded-xl border border-current/10 bg-white/80 p-4 text-sm leading-6 text-[#59645e]">{note || "Run the conflict check to compare this client against accessible contacts and subjects."}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={rerun} disabled={isPending} className="border-[#c8d8dc] bg-white text-[#385367]">{saving === "check" ? <Loader2 className="animate-spin" /> : <RefreshCw />} {saving === "check" ? "Checking…" : "Run conflict check"}</Button>{possible ? <Button size="sm" variant="outline" onClick={() => decide("clear")} disabled={isPending} className="border-amber-300 bg-white text-amber-800">I reviewed this match</Button> : null}{!clear ? <Button size="sm" variant="ghost" onClick={() => decide("waived")} disabled={isPending} className="text-[#737872]">Waive with note</Button> : null}</div>{error ? <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}</div><aside className="rounded-xl border border-current/10 bg-white/75 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#737872]">Client workflow</p><div className="mt-3 space-y-2 text-xs"><div className="flex items-center justify-between gap-3"><span className="text-[#8b8d88]">Conflict review</span><span className={cn("font-semibold", clear ? "text-emerald-700" : possible ? "text-amber-700" : "text-[#737872]")}>{statusLabel(status)}</span></div><div className="flex items-center justify-between gap-3"><span className="text-[#8b8d88]">Engagement letter</span><span className="font-semibold capitalize text-[#737872]">{engagementStatus.replace("_", " ")}</span></div></div><Link href="/matterpilot#calendar" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#385367] hover:underline">Open client workflow <ClipboardCheck className="size-3.5" /></Link></aside></div>
  </section>
}
