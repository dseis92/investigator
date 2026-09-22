import Link from "next/link"

import { ArrowUpRight } from "lucide-react"

import type { Matter } from "@/lib/domain"
import { formatDate, humanizeEnum } from "@/lib/format"
import { cn } from "@/lib/utils"

export function MatterHeader({ matter, section }: { matter: Matter; section?: string }) {
  const statusTone = matter.status === "active" ? "bg-emerald-50 text-emerald-700" : matter.status === "closed" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"

  return (
    <header className="mb-7 flex flex-col gap-5 border-b border-[#ded9d0] pb-6 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#8b8d88]">
          <Link href="/matters" className="transition-colors hover:text-[#a24f31]">All matters</Link>
          <span className="text-[#c7c0b6]">/</span>
          {section ? <Link href={`/matters/${matter.id}`} className="transition-colors hover:text-[#a24f31]">{matter.name}</Link> : <span>{matter.name}</span>}
          {section ? <><span className="text-[#c7c0b6]">/</span><span className="font-medium text-[#59645e]">{section}</span></> : null}
        </div>
        <Link href="/matterpilot" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b65f3a] hover:underline">Open MatterPilot <ArrowUpRight className="size-3.5" /></Link>
      </div>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">{section ?? "Matter command center"}</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.03em] text-[#23313d] sm:text-4xl">{matter.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#737872]">
            <span className="font-semibold text-[#4d5851]">{matter.matter_number}</span>
            <span className="text-[#c7c0b6]">·</span>
            <span>{humanizeEnum(matter.case_mode)}</span>
            {matter.jurisdiction ? <><span className="text-[#c7c0b6]">·</span><span>{matter.jurisdiction}</span></> : null}
            {matter.venue ? <><span className="text-[#c7c0b6]">·</span><span>{matter.venue}</span></> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em]", statusTone)}><span className="size-1.5 rounded-full bg-current" />{humanizeEnum(matter.status)}</span>
          {matter.next_deadline_at ? <span className="rounded-full bg-[#f1eee8] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#777b76]">Next deadline · {formatDate(matter.next_deadline_at)}</span> : null}
        </div>
      </div>
    </header>
  )
}
