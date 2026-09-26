"use client"

import { ClipboardCheck, FileText, Loader2, RotateCcw } from "lucide-react"
import { useState, useTransition } from "react"

import { updateMatterOnboardingItemAction } from "@/app/matters/[matterId]/onboarding-actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type OnboardingItem = {
  id: string
  item_type: "task" | "document"
  title: string
  status: "open" | "completed" | "waived"
  is_required: boolean
}

export function MatterOnboardingPanel({ matterId, items }: { matterId: string; items: OnboardingItem[] }) {
  const [localItems, setLocalItems] = useState(items)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const openCount = localItems.filter((item) => item.status === "open").length
  const completedCount = localItems.length - openCount

  function update(item: OnboardingItem) {
    const nextStatus = item.status === "open" ? "completed" : "open"
    setError("")
    setPendingId(item.id)
    startTransition(async () => {
      const result = await updateMatterOnboardingItemAction({ matterId, itemId: item.id, status: nextStatus })
      setPendingId(null)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setLocalItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, status: nextStatus } : currentItem))
    })
  }

  if (!localItems.length) return null

  return (
    <section className="rounded-2xl border border-[#d5c8b9] bg-[#fffaf6] shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#eadbd0] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div>
          <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-[#b65f3a]" /><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b604c]">Matter onboarding kit</p></div>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-[#23313d]">Get this matter ready to work</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#8b6f60]">Complete the setup queue created from your firm’s onboarding kit. Intake questions are already in the investigative queue.</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#f2e2d8] px-3 py-1.5 text-[10px] font-bold text-[#8b604c]">{completedCount} of {localItems.length} complete</span>
      </div>
      <div className="space-y-2 p-5 sm:p-7">
        {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
        {localItems.map((item) => {
          const done = item.status !== "open"
          return <div key={item.id} className={cn("flex items-center gap-3 rounded-xl border bg-white p-3.5 transition-colors", done ? "border-[#dbe8dc]" : "border-[#eadbd0]")}>
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", item.item_type === "document" ? "bg-[#e8eef0] text-[#385367]" : "bg-[#f4e5db] text-[#a24f31]")}>{item.item_type === "document" ? <FileText className="size-4" /> : <ClipboardCheck className="size-4" />}</span>
            <div className="min-w-0 flex-1"><p className={cn("text-sm font-semibold", done ? "text-[#77817a] line-through" : "text-[#39443f]")}>{item.title}</p><p className="mt-0.5 text-[11px] text-[#9b9d97]">{item.item_type === "document" ? "Document request" : "Setup task"}{item.is_required ? " · Required" : " · Optional"}</p></div>
            <Button size="sm" variant={done ? "ghost" : "outline"} onClick={() => update(item)} disabled={isPending && pendingId === item.id} className={cn("shrink-0 px-2.5 text-[11px]", done ? "text-[#8b604c]" : "border-[#d8c7bb] text-[#a24f31]")}>{isPending && pendingId === item.id ? <Loader2 className="animate-spin" /> : done ? <><RotateCcw /> Reopen</> : "Mark complete"}</Button>
          </div>
        })}
      </div>
    </section>
  )
}
