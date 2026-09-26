import { subDays } from "date-fns"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ArrowUpRight, BookOpen, CheckCircle2, FileSearch, Gavel, ShieldAlert } from "lucide-react"

import { AuditTrail, type AuditTrailEntry } from "@/components/audit-trail"
import { EvidenceHealthPanel } from "@/components/matters/evidence-health-panel"
import { MatterHeader } from "@/components/matters/matter-header"
import { MatterOnboardingPanel } from "@/components/matters/matter-onboarding-panel"
import { RecommendedActionsList } from "@/components/matters/recommended-actions-list"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { recommendedActions } from "@/lib/matters/recommended-actions"
import { createClient } from "@/lib/supabase/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matterId: string }>
}): Promise<Metadata> {
  const { matterId } = await params
  const supabase = await createClient()
  const { data: matter } = await supabase.from("matters").select("name").eq("id", matterId).maybeSingle()
  return { title: matter?.name ?? "Matter" }
}

export default async function MatterCommandCenterPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const fourteenDaysAgo = subDays(new Date(), 14).toISOString()

  const [
    { data: questions },
    { data: propositions },
    { data: evidenceLinks },
    { count: unresolvedContradictions },
    { count: weakProvenanceEvidenceCount },
    { count: staleEvidenceCount },
    { count: openLeadsCount },
    { count: subjectsCount },
    { count: evidenceCount },
    { data: openQuestions },
    { data: auditRows },
    { data: onboardingItems },
  ] = await Promise.all([
    supabase.from("questions").select("id").eq("matter_id", matterId),
    supabase.from("propositions").select("id, question_id").eq("matter_id", matterId),
    supabase.from("evidence_links").select("proposition_id").eq("matter_id", matterId).not("proposition_id", "is", null),
    supabase
      .from("contradictions")
      .select("id", { count: "exact", head: true })
      .eq("matter_id", matterId)
      .eq("resolution_status", "unresolved"),
    supabase
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("matter_id", matterId)
      .in("provenance_status", ["unknown", "disputed"])
      .eq("is_excluded", false),
    supabase
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("matter_id", matterId)
      .eq("review_state", "new")
      .lt("created_at", fourteenDaysAgo),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("matter_id", matterId)
      .in("status", ["open", "in_progress"]),
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("matter_id", matterId),
    supabase
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("matter_id", matterId)
      .eq("is_excluded", false),
    supabase
      .from("questions")
      .select("id, prompt, priority, status, owner:profiles!questions_owner_id_fkey(full_name)")
      .eq("matter_id", matterId)
      .order("priority", { ascending: true })
      .limit(5),
    supabase
      .from("audit_events")
      .select("id, action, entity_type, summary, created_at, actor:profiles(full_name)")
      .eq("matter_id", matterId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("matter_onboarding_items")
      .select("id, item_type, title, status, is_required")
      .eq("matter_id", matterId)
      .order("created_at", { ascending: true }),
  ])

  const propositionIdsWithEvidence = new Set((evidenceLinks ?? []).map((l) => l.proposition_id))
  const questionIdsWithAnyProposition = new Set((propositions ?? []).map((p) => p.question_id))

  const summary = {
    matterId,
    openQuestionsWithoutPropositions: (questions ?? []).filter((q) => !questionIdsWithAnyProposition.has(q.id))
      .length,
    propositionsMissingEvidence: (propositions ?? []).filter((p) => !propositionIdsWithEvidence.has(p.id)).length,
    unresolvedContradictions: unresolvedContradictions ?? 0,
    weakProvenanceEvidenceCount: weakProvenanceEvidenceCount ?? 0,
    staleEvidenceCount: staleEvidenceCount ?? 0,
    openLeadsCount: openLeadsCount ?? 0,
    subjectsCount: subjectsCount ?? 0,
    evidenceCount: evidenceCount ?? 0,
  }

  const actions = recommendedActions(summary)

  const auditEntries: AuditTrailEntry[] = (auditRows ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entity_type: row.entity_type,
    summary: row.summary,
    created_at: row.created_at,
    actor_name: (row.actor as { full_name: string | null } | null)?.full_name ?? null,
  }))

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} />

      <MatterOnboardingPanel matterId={matterId} items={(onboardingItems ?? []) as { id: string; item_type: "task" | "document"; title: string; status: "open" | "completed" | "waived"; is_required: boolean }[]} />

      <section className="relative overflow-hidden rounded-2xl bg-[#23313d] px-5 py-6 text-white shadow-xl shadow-[#23313d]/10 sm:px-7 sm:py-7">
        <div className="absolute -right-16 -top-24 size-72 rounded-full border border-white/10" />
        <div className="absolute -right-6 -top-14 size-52 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5a083]"><span className="size-1.5 rounded-full bg-[#d5a083]" /> Record posture</div>
            <h2 className="max-w-xl font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">Keep the theory close<br /><span className="text-[#d5a083]">and the gaps visible.</span></h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#b9c5ca]">The Command Center is your matter-level view of what is known, what is contested, and what deserves the next investigative move.</p>
          </div>
          <div className="grid grid-cols-3 gap-5 border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <div><p className="text-2xl font-semibold tracking-tight">{summary.evidenceCount}</p><p className="mt-1 text-[10px] text-[#aab8be]">evidence items</p></div>
            <div><p className="text-2xl font-semibold tracking-tight text-[#e9b18e]">{summary.openLeadsCount}</p><p className="mt-1 text-[10px] text-[#aab8be]">open leads</p></div>
            <div><p className="text-2xl font-semibold tracking-tight">{summary.subjectsCount}</p><p className="mt-1 text-[10px] text-[#aab8be]">subjects</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-[#ded9d0] bg-[#fbfaf7] shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#f4e5db] text-[#a24f31]"><BookOpen className="size-4" /></span><div><CardTitle className="font-serif text-xl text-[#23313d]">Case theory</CardTitle><p className="mt-1 text-xs text-[#8b8d88]">The working explanations your team is testing.</p></div></div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b765f]">Defense theory</p>
                <p className="rounded-xl bg-[#f8f5ef] p-3 text-sm leading-6 text-[#4d5851]">{matter.defense_theory || "Not yet documented."}</p>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b765f]">Opposing theory</p>
                <p className="rounded-xl bg-[#f8f5ef] p-3 text-sm leading-6 text-[#4d5851]">{matter.opposing_theory || "Not yet documented."}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b765f]">Alternative explanations</p>
                <p className="rounded-xl bg-[#f8f5ef] p-3 text-sm leading-6 text-[#4d5851]">{matter.alternative_explanations || "Not yet documented."}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#ded9d0] bg-[#fbfaf7] shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><ShieldAlert className="size-4" /></span><div><CardTitle className="font-serif text-xl text-[#23313d]">Evidence health</CardTitle><p className="mt-1 text-xs text-[#8b8d88]">Signals that may change the next decision.</p></div></div>
            </CardHeader>
            <CardContent>
              <EvidenceHealthPanel summary={summary} />
            </CardContent>
          </Card>

          <Card className="border-[#ded9d0] bg-[#fbfaf7] shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#e8eadf] text-[#5e705d]"><FileSearch className="size-4" /></span><div><CardTitle className="font-serif text-xl text-[#23313d]">Investigative questions</CardTitle><p className="mt-1 text-xs text-[#8b8d88]">Unanswered threads that need an owner.</p></div></div>
            </CardHeader>
            <CardContent className="space-y-2">
              {openQuestions && openQuestions.length > 0 ? (
                openQuestions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e8e3da] bg-white p-3 text-sm transition-colors hover:border-[#c08a6d]">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#39443f]">{q.prompt}</p>
                      <p className="mt-1 text-xs text-[#8b8d88]">
                        {(q.owner as { full_name: string | null } | null)?.full_name ?? "Unassigned"} · {q.priority} priority
                      </p>
                    </div>
                    <StatusBadge status={q.status} />
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#d8d1c6] bg-[#faf8f4] px-4 py-8 text-center"><CheckCircle2 className="mx-auto size-6 text-[#9ca99c]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">No open questions yet.</p><p className="mt-1 text-xs text-[#8b8d88]">Your investigative queue is clear.</p></div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-[#ded9d0] bg-[#fbfaf7] shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#f4e5db] text-[#a24f31]"><Gavel className="size-4" /></span><div><CardTitle className="font-serif text-xl text-[#23313d]">Recommended next actions</CardTitle><p className="mt-1 text-xs text-[#8b8d88]">The shortest path to a stronger record.</p></div></div>
            </CardHeader>
            <CardContent>
              <div className="[&_a]:border-[#e8e3da] [&_a]:bg-white [&_a]:rounded-xl [&_a]:p-3 [&_a:hover]:border-[#c08a6d]"><RecommendedActionsList actions={actions} /></div>
            </CardContent>
          </Card>

          <Card className="border-[#ded9d0] bg-[#fbfaf7] shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><ArrowUpRight className="size-4" /></span><div><CardTitle className="font-serif text-xl text-[#23313d]">Recent activity</CardTitle><p className="mt-1 text-xs text-[#8b8d88]">A traceable record of what changed.</p></div></div>
            </CardHeader>
            <CardContent>
              <div className="[&_li]:border-[#e8e3da] [&_li]:py-3 [&_li:first-child]:pt-0"><AuditTrail entries={auditEntries} className="max-h-80" /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
