"use client"

import {
  AlarmClock,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ContactRound,
  FileSearch,
  Gavel,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"

import { CreateMatterDialog } from "@/components/matters/create-matter-dialog"
import { SignOutButton } from "@/components/sign-out-button"
import { formatDate, humanizeEnum } from "@/lib/format"
import { cn } from "@/lib/utils"

export type IntelligenceMatter = {
  id: string
  matter_number: string
  name: string
  case_mode: string
  status: string
  jurisdiction: string | null
  next_deadline_at: string | null
}

const workspaceNav = [
  { label: "Overview", icon: LayoutDashboard, href: "/matterpilot" },
  { label: "Calendar", icon: CalendarDays, href: "/matterpilot#calendar" },
  { label: "Matters", icon: Gavel, href: "/matters" },
  { label: "Intake", icon: UserRound, href: "/matterpilot/intake", count: 3 },
  { label: "Tasks", icon: ClipboardCheck, href: "/matterpilot#tasks", count: 8 },
  { label: "Communications", icon: Send, href: "/matterpilot#communications" },
  { label: "Deadlines", icon: CalendarClock, href: "/matterpilot#deadlines" },
  { label: "Contacts", icon: ContactRound, href: "/matterpilot#contacts" },
  { label: "Portal", icon: LockKeyhole, href: "/matterpilot#verified-portal" },
]

function WorkspaceSidebar({ mobileNav, onClose }: { mobileNav: boolean; onClose: () => void }) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#ded9d0] bg-[#1f303d] text-white transition-transform lg:static lg:translate-x-0",
        mobileNav ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
        <Link href="/matterpilot" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#c4724c] shadow-lg shadow-[#c4724c]/20">
            <Sparkles className="size-4" />
          </span>
          <span>
            <span className="block font-serif text-lg font-semibold tracking-tight">MatterPilot</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-[#aebbc1]">Legal operations</span>
          </span>
        </Link>
        <button type="button" className="lg:hidden" onClick={onClose} aria-label="Close navigation">
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-6">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a5ae]">Workspace</p>
        <nav className="space-y-1" aria-label="MatterPilot workspace">
          {workspaceNav.map((item) => {
            const Icon = item.icon
            const active = item.label === "Matters" && pathname === "/matters"
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-white/12 text-white shadow-sm" : "text-[#b8c2c6] hover:bg-white/7 hover:text-white"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                {item.count ? <span className="rounded-full bg-[#314552] px-2 py-0.5 text-[10px] font-bold text-[#c8d1d4]">{item.count}</span> : null}
              </Link>
            )
          })}
        </nav>

        <div className="my-7 border-t border-white/10" />
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a5ae]">Tools</p>
        <nav className="space-y-1" aria-label="MatterPilot tools">
          <Link href="/matters" onClick={onClose} className="flex items-center gap-3 rounded-lg bg-[#c4724c]/15 px-3 py-2.5 text-sm text-[#f2c5ad] transition-colors hover:bg-[#c4724c]/25">
            <FileSearch className="size-4" />
            TraceLine intelligence
          </Link>
          <Link href="/matterpilot#settings" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#b8c2c6] transition-colors hover:bg-white/7 hover:text-white">
            <Settings2 className="size-4" />
            Settings
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/7 p-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#c4724c] text-[10px] font-bold">MC</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold">Maya Chen</span>
            <span className="block text-[10px] text-[#9eafb6]">Attorney · Harbor Legal</span>
          </span>
          <ChevronDown className="ml-auto size-3 text-[#92a2a9]" />
        </div>
        <SignOutButton />
      </div>
    </aside>
  )
}

function IntelligenceStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const style = normalized === "active"
    ? "border-emerald-500/25 bg-emerald-50 text-emerald-700"
    : normalized === "closed"
      ? "border-slate-300 bg-slate-100 text-slate-600"
      : "border-amber-500/25 bg-amber-50 text-amber-700"

  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]", style)}><span className="size-1.5 rounded-full bg-current" />{humanizeEnum(status)}</span>
}

function MatterCard({ matter, index }: { matter: IntelligenceMatter; index: number }) {
  return (
    <Link
      href={`/matters/${matter.id}`}
      className="group relative flex min-h-56 flex-col overflow-hidden rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c08a6d] hover:bg-[#fffaf6] hover:shadow-lg hover:shadow-[#23313d]/6"
    >
      <span className="absolute right-0 top-0 h-24 w-24 rounded-bl-[4rem] bg-[#f3eee6] transition-colors group-hover:bg-[#f4e5db]" />
      <div className="relative flex items-start justify-between gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", index % 3 === 0 ? "bg-[#e8eef0] text-[#385367]" : index % 3 === 1 ? "bg-[#f4e5db] text-[#955033]" : "bg-[#e8eadf] text-[#5e705d]")}>
          <Gavel className="size-5" />
        </span>
        <IntelligenceStatus status={matter.status} />
      </div>
      <div className="relative mt-5 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#b65f3a]">{matter.matter_number}</p>
        <h2 className="mt-1 truncate font-serif text-xl font-semibold tracking-[-0.02em] text-[#23313d]">{matter.name}</h2>
        <p className="mt-2 truncate text-xs text-[#737872]">{humanizeEnum(matter.case_mode)}{matter.jurisdiction ? ` · ${matter.jurisdiction}` : ""}</p>
      </div>
      <div className="relative mt-auto flex items-end justify-between gap-4 border-t border-[#ece6dc] pt-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b9d97]">Next signal</p>
          <p className="mt-1 truncate text-xs font-medium text-[#4d5851]">{matter.next_deadline_at ? formatDate(matter.next_deadline_at) : "No deadline recorded"}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#e1dbd1] bg-white text-[#9b765f] transition-all group-hover:border-[#c08a6d] group-hover:bg-[#b65f3a] group-hover:text-white">
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export function IntelligenceDashboard({ matters }: { matters: IntelligenceMatter[] }) {
  const [mobileNav, setMobileNav] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const statuses = useMemo(() => Array.from(new Set(matters.map((matter) => matter.status))), [matters])
  const filteredMatters = useMemo(() => {
    const query = search.trim().toLowerCase()
    return matters.filter((matter) => {
      const matchesStatus = statusFilter === "all" || matter.status === statusFilter
      const matchesQuery = !query || `${matter.name} ${matter.matter_number} ${matter.case_mode} ${matter.jurisdiction ?? ""}`.toLowerCase().includes(query)
      return matchesStatus && matchesQuery
    })
  }, [matters, search, statusFilter])
  const activeMatterCount = matters.filter((matter) => matter.status === "active").length
  const deadlineCount = matters.filter((matter) => matter.next_deadline_at).length
  const jurisdictionCount = new Set(matters.map((matter) => matter.jurisdiction).filter(Boolean)).size

  return (
    <div className="min-h-svh bg-[#f4f1eb] text-[#23313d]">
      <div className="flex min-h-svh">
        <WorkspaceSidebar mobileNav={mobileNav} onClose={() => setMobileNav(false)} />

        <main className="min-w-0 flex-1">
          <header className="flex min-h-20 items-center justify-between gap-4 border-b border-[#ded9d0] bg-[#fbfaf7]/85 px-4 py-4 backdrop-blur sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-[#54615e] hover:bg-[#eeeae3] lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">TraceLine intelligence</p>
                <h1 className="mt-0.5 truncate font-serif text-xl font-semibold tracking-[-0.02em] text-[#23313d] sm:text-2xl">Matter intelligence desk</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label className="hidden items-center gap-2 rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-xs text-[#8a8d87] md:flex">
                <Search className="size-3.5" />
                <span className="sr-only">Search matters</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search matters" className="w-40 bg-transparent outline-none placeholder:text-[#a1a39d]" />
              </label>
              <CreateMatterDialog />
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-6 sm:px-7 sm:py-8">
            <section className="relative overflow-hidden rounded-2xl bg-[#23313d] px-5 py-7 text-white shadow-xl shadow-[#23313d]/10 sm:px-8 sm:py-9">
              <div className="absolute -right-16 -top-24 size-72 rounded-full border border-white/10" />
              <div className="absolute -right-6 -top-14 size-52 rounded-full border border-white/10" />
              <div className="absolute bottom-0 right-1/3 h-px w-40 bg-[#d5a083]/40" />
              <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5a083]"><span className="size-1.5 rounded-full bg-[#d5a083]" /> Evidence-led workspace</div>
                  <h2 className="max-w-2xl font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">See the shape of every matter.<br /><span className="text-[#d5a083]">Find the signal before it becomes a surprise.</span></h2>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-[#b9c5ca]">TraceLine Intelligence keeps the case record, unanswered questions, evidence health, and next deadlines in one calm working view.</p>
                </div>
                <div className="grid shrink-0 grid-cols-3 gap-6 border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                  <div><p className="text-3xl font-semibold tracking-tight">{matters.length}</p><p className="mt-1 text-[11px] text-[#aab8be]">matters</p></div>
                  <div><p className="text-3xl font-semibold tracking-tight text-[#e9b18e]">{deadlineCount}</p><p className="mt-1 text-[11px] text-[#aab8be]">with deadlines</p></div>
                  <div><p className="text-3xl font-semibold tracking-tight">{jurisdictionCount || "—"}</p><p className="mt-1 text-[11px] text-[#aab8be]">jurisdictions</p></div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#ded9d0] bg-[#fbfaf7] p-4 shadow-sm"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#5c665f]"><span className="size-2 rounded-full bg-emerald-500" /> Active matters</span><CheckCircle2 className="size-4 text-emerald-600" /></div><p className="mt-3 text-2xl font-semibold text-[#23313d]">{activeMatterCount}</p><p className="mt-1 text-xs text-[#8b8d88]">Currently in motion</p></div>
              <div className="rounded-xl border border-[#ded9d0] bg-[#fbfaf7] p-4 shadow-sm"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#5c665f]"><span className="size-2 rounded-full bg-amber-500" /> Deadline coverage</span><AlarmClock className="size-4 text-amber-600" /></div><p className="mt-3 text-2xl font-semibold text-[#23313d]">{deadlineCount}<span className="ml-1 text-sm font-medium text-[#8b8d88]">/ {matters.length || 0}</span></p><p className="mt-1 text-xs text-[#8b8d88]">Matters with a next date</p></div>
              <div className="rounded-xl border border-[#ded9d0] bg-[#fbfaf7] p-4 shadow-sm"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#5c665f]"><span className="size-2 rounded-full bg-[#b65f3a]" /> Review posture</span><ShieldCheck className="size-4 text-[#b65f3a]" /></div><p className="mt-3 text-2xl font-semibold text-[#23313d]">{matters.length ? "Live" : "Ready"}</p><p className="mt-1 text-xs text-[#8b8d88]">Evidence workspace status</p></div>
            </section>

            <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm">
              <div className="flex flex-col gap-4 border-b border-[#e8e3da] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                <div><div className="flex items-center gap-2"><FileSearch className="size-4 text-[#b65f3a]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Your matters</h2><span className="rounded-full bg-[#eeeae3] px-2 py-0.5 text-[10px] font-bold text-[#777b76]">{filteredMatters.length} shown</span></div><p className="mt-1 text-xs text-[#8b8d88]">Open a matter to move from the record to the next defensible action.</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-[#ded9d0] bg-white p-1" role="group" aria-label="Filter matters by status">
                    <button type="button" onClick={() => setStatusFilter("all")} className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors", statusFilter === "all" ? "bg-[#23313d] text-white" : "text-[#7b817b] hover:bg-[#f1eee8]")}>All</button>
                    {statuses.map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors", statusFilter === status ? "bg-[#23313d] text-white" : "text-[#7b817b] hover:bg-[#f1eee8]")}>{humanizeEnum(status)}</button>)}
                  </div>
                  <button type="button" onClick={() => { setSearch(""); setStatusFilter("all") }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-[#b65f3a] hover:bg-[#fff5ef]"><Search className="size-3.5" /> Reset</button>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {filteredMatters.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredMatters.map((matter, index) => <MatterCard key={matter.id} matter={matter} index={index} />)}</div> : <div className="rounded-xl border border-dashed border-[#d8d1c6] bg-[#faf8f4] px-6 py-12 text-center"><FileSearch className="mx-auto size-7 text-[#b7afa3]" /><p className="mt-4 text-sm font-semibold text-[#4d5851]">No matters match this view.</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#8b8d88]">Try a different search or clear the filter. Your access is still scoped to the matters available to your team.</p><button type="button" onClick={() => { setSearch(""); setStatusFilter("all") }} className="mt-4 text-xs font-semibold text-[#b65f3a] hover:underline">Clear filters</button></div>}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><ShieldCheck className="size-5" /></span><div><h2 className="font-serif text-xl font-semibold text-[#23313d]">A quieter command center</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[#737872]">TraceLine separates what a source says, what the team infers, and what still needs proof. The result is a matter record your team can reason from—not just a folder of files.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#f1eee8] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b765f]">Questions</p><p className="mt-2 text-xs leading-5 text-[#59645e]">Turn uncertainty into an assigned investigative thread.</p></div><div className="rounded-xl bg-[#f1eee8] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b765f]">Evidence</p><p className="mt-2 text-xs leading-5 text-[#59645e]">Keep provenance and limitations visible at the point of use.</p></div><div className="rounded-xl bg-[#f1eee8] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b765f]">Review</p><p className="mt-2 text-xs leading-5 text-[#59645e]">Surface contradictions before they become surprises.</p></div></div></div>
              <div className="rounded-2xl border border-[#d5c8b9] bg-[#ead9c4] p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2 text-[#6f4f3c]"><Plus className="size-4" /><span className="text-xs font-bold uppercase tracking-[0.16em]">Start a workspace</span></div><h2 className="mt-4 font-serif text-2xl font-semibold leading-tight text-[#3b3029]">Add a matter when the facts are ready to move.</h2><p className="mt-2 text-sm leading-6 text-[#705d50]">Create the private case workspace first. Then add the questions, subjects, evidence, and deadlines that make the record useful.</p><CreateMatterDialog /></div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
