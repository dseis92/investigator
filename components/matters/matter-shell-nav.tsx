"use client"

import {
  ArrowLeft,
  FileText,
  GitCompareArrows,
  HelpCircle,
  LayoutDashboard,
  ListTree,
  Menu,
  Scale,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { SignOutButton } from "@/components/sign-out-button"
import type { Matter } from "@/lib/domain"
import { humanizeEnum } from "@/lib/format"
import { cn } from "@/lib/utils"

const navItems = (matterId: string) => [
  { href: `/matters/${matterId}`, label: "Command Center", icon: LayoutDashboard, exact: true },
  { href: `/matters/${matterId}/questions`, label: "Questions", icon: HelpCircle },
  { href: `/matters/${matterId}/subjects`, label: "Subjects", icon: Users },
  { href: `/matters/${matterId}/evidence`, label: "Evidence", icon: ListTree },
  { href: `/matters/${matterId}/timeline`, label: "Timeline", icon: GitCompareArrows },
  { href: `/matters/${matterId}/contradictions`, label: "Contradictions", icon: GitCompareArrows },
  { href: `/matters/${matterId}/analysis`, label: "Analysis", icon: Sparkles },
  { href: `/matters/${matterId}/reports`, label: "Reports", icon: FileText },
]

function MatterStatus({ status }: { status: string }) {
  const tone = status === "active" ? "bg-emerald-400/15 text-emerald-200" : status === "closed" ? "bg-white/10 text-[#c7d0d3]" : "bg-[#d5a083]/15 text-[#f1c3ad]"
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]", tone)}><span className="size-1.5 rounded-full bg-current" />{humanizeEnum(status)}</span>
}

type WorkspaceMatter = Pick<Matter, "id" | "name" | "matter_number" | "status" | "case_mode">

export function MatterWorkspaceShell({ matter, children }: { matter: WorkspaceMatter; children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileNav, setMobileNav] = useState(false)
  const items = navItems(matter.id)

  return (
    <div className="min-h-svh bg-[#f4f1eb] text-[#23313d]">
      <div className="flex min-h-svh">
        <aside className={cn("fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-[#ded9d0] bg-[#1f303d] text-white transition-transform lg:static lg:translate-x-0", mobileNav ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
            <Link href="/matterpilot" className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#c4724c] shadow-lg shadow-[#c4724c]/20"><Scale className="size-4" /></span>
              <span><span className="block font-serif text-lg font-semibold tracking-tight">MatterPilot</span><span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-[#aebbc1]">TraceLine intelligence</span></span>
            </Link>
            <button type="button" className="lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close matter navigation"><X className="size-5" /></button>
          </div>

          <div className="border-b border-white/10 px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a5ae]">Current matter</p>
            <p className="mt-3 truncate font-serif text-xl font-semibold tracking-[-0.02em]">{matter.name}</p>
            <p className="mt-1 text-xs text-[#aebbc1]">{matter.matter_number} · {humanizeEnum(matter.case_mode)}</p>
            <div className="mt-4"><MatterStatus status={matter.status} /></div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-6">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a5ae]">Matter workspace</p>
            <nav aria-label="Matter navigation" className="space-y-1">
              {items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                const Icon = item.icon
                return <Link key={item.href} href={item.href} onClick={() => setMobileNav(false)} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", active ? "bg-white/12 font-medium text-white shadow-sm" : "text-[#b8c2c6] hover:bg-white/7 hover:text-white")}><Icon className="size-4 shrink-0" />{item.label}</Link>
              })}
            </nav>
            <div className="my-7 border-t border-white/10" />
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a5ae]">Tools</p>
            <Link href="/matters" onClick={() => setMobileNav(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#b8c2c6] transition-colors hover:bg-white/7 hover:text-white"><ArrowLeft className="size-4" />All matters</Link>
            <Link href="/matterpilot#settings" onClick={() => setMobileNav(false)} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#b8c2c6] transition-colors hover:bg-white/7 hover:text-white"><Settings2 className="size-4" />Settings</Link>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/7 p-3"><span className="flex size-7 items-center justify-center rounded-full bg-[#c4724c] text-[10px] font-bold">MC</span><span className="min-w-0"><span className="block truncate text-xs font-semibold">Maya Chen</span><span className="block text-[10px] text-[#9eafb6]">Attorney · Harbor Legal</span></span></div>
            <SignOutButton />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex min-h-20 items-center justify-between gap-4 border-b border-[#ded9d0] bg-[#fbfaf7]/85 px-4 py-4 backdrop-blur sm:px-7 print:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-[#54615e] hover:bg-[#eeeae3] lg:hidden" aria-label="Open matter navigation"><Menu className="size-5" /></button>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">TraceLine intelligence · {matter.matter_number}</p><p className="mt-0.5 truncate text-sm font-semibold text-[#35433e]">{matter.name}</p></div>
            </div>
            <Link href="/matters" className="hidden items-center gap-2 rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-xs font-semibold text-[#59645e] transition-colors hover:border-[#c08a6d] hover:text-[#a24f31] sm:inline-flex"><ArrowLeft className="size-3.5" />All matters</Link>
          </header>
          <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
