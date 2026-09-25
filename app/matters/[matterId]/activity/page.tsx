import { Activity, Search } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AuditTrail, type AuditTrailEntry } from "@/components/audit-trail"
import { MatterHeader } from "@/components/matters/matter-header"
import { createClient } from "@/lib/supabase/server"
import { humanizeEnum } from "@/lib/format"

export const metadata: Metadata = { title: "Activity" }

export default async function MatterActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ matterId: string }>
  searchParams?: Promise<{ entity?: string; q?: string }>
}) {
  const { matterId } = await params
  const queryParams = searchParams ? await searchParams : {}
  const entityFilter = queryParams.entity?.trim() ?? ""
  const searchQuery = queryParams.q?.trim().toLowerCase() ?? ""
  const supabase = await createClient()
  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const { data: auditRows } = await supabase
    .from("audit_events")
    .select("id, action, entity_type, summary, created_at, actor:profiles(full_name)")
    .eq("matter_id", matterId)
    .order("created_at", { ascending: false })
    .limit(250)

  const entries: AuditTrailEntry[] = (auditRows ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entity_type: row.entity_type,
    summary: row.summary,
    created_at: row.created_at,
    actor_name: (row.actor as { full_name: string | null } | null)?.full_name ?? null,
  }))
  const entityTypes = [...new Set(entries.map((entry) => entry.entity_type))].sort()
  const filteredEntries = entries.filter((entry) => {
    const matchesEntity = !entityFilter || entry.entity_type === entityFilter
    const haystack = `${entry.summary} ${entry.action} ${entry.entity_type} ${entry.actor_name ?? ""}`.toLowerCase()
    return matchesEntity && (!searchQuery || haystack.includes(searchQuery))
  })
  const weekAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000
  const recentCount = entries.filter((entry) => new Date(entry.created_at).getTime() >= weekAgo).length
  const actorCount = new Set(entries.map((entry) => entry.actor_name ?? "unknown")).size

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Activity" />

      <section className="relative overflow-hidden rounded-2xl bg-[#23313d] px-5 py-6 text-white shadow-xl shadow-[#23313d]/10 sm:px-7 sm:py-7">
        <div className="absolute -right-16 -top-24 size-72 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5a083]"><Activity className="size-3.5" /> Matter activity</div>
            <h2 className="max-w-2xl font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">A traceable record of what changed.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#b9c5ca]">Review scheduling, evidence, analysis, portal, and report activity without losing the matter context.</p>
          </div>
          <div className="grid grid-cols-3 gap-5 border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <div><p className="text-2xl font-semibold tracking-tight">{entries.length}</p><p className="mt-1 text-[10px] text-[#aab8be]">total events</p></div>
            <div><p className="text-2xl font-semibold tracking-tight text-[#e9b18e]">{recentCount}</p><p className="mt-1 text-[10px] text-[#aab8be]">last 7 days</p></div>
            <div><p className="text-2xl font-semibold tracking-tight">{actorCount}</p><p className="mt-1 text-[10px] text-[#aab8be]">contributors</p></div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-6">
        <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
          <label className="text-xs font-semibold text-[#5e655f]">Search activity<input name="q" defaultValue={queryParams.q ?? ""} placeholder="Search summaries, actions, or people" className="mt-1 h-10 w-full rounded-lg border border-[#dcd6cc] bg-white px-3 text-sm font-normal text-[#39443f] outline-none focus:border-[#b65f3a]" /></label>
          <label className="text-xs font-semibold text-[#5e655f]">Area<select name="entity" defaultValue={entityFilter} className="mt-1 h-10 w-full rounded-lg border border-[#dcd6cc] bg-white px-3 text-sm font-normal text-[#39443f] outline-none focus:border-[#b65f3a]"><option value="">All activity</option>{entityTypes.map((entity) => <option key={entity} value={entity}>{humanizeEnum(entity)}</option>)}</select></label>
          <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#b65f3a] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#9f5030]"><Search className="size-3.5" />Filter</button>
        </form>
        <div className="mt-5 flex items-center justify-between border-t border-[#e8e3da] pt-4 text-xs text-[#8b8d88]"><span>{filteredEntries.length} matching event{filteredEntries.length === 1 ? "" : "s"}</span>{entityFilter || searchQuery ? <a href={`/matters/${matterId}/activity`} className="font-semibold text-[#a24f31] hover:underline">Clear filters</a> : <span>Newest first</span>}</div>
      </section>

      <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><Activity className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#b65f3a]">Audit trail</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#23313d]">Matter history</h2></div></div>
        <div className="mt-5"><AuditTrail entries={filteredEntries} className="max-h-[720px]" /></div>
      </section>
    </div>
  )
}
