import { subDays } from "date-fns"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AuditTrail, type AuditTrailEntry } from "@/components/audit-trail"
import { EvidenceHealthPanel } from "@/components/matters/evidence-health-panel"
import { MatterHeader } from "@/components/matters/matter-header"
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Case theory</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Defense theory</p>
                <p className="text-sm">{matter.defense_theory || "Not yet documented."}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Opposing theory</p>
                <p className="text-sm">{matter.opposing_theory || "Not yet documented."}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Alternative explanations</p>
                <p className="text-sm">{matter.alternative_explanations || "Not yet documented."}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Evidence health</CardTitle>
            </CardHeader>
            <CardContent>
              <EvidenceHealthPanel summary={summary} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Investigative questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {openQuestions && openQuestions.length > 0 ? (
                openQuestions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{q.prompt}</p>
                      <p className="text-xs text-muted-foreground">
                        {(q.owner as { full_name: string | null } | null)?.full_name ?? "Unassigned"} · {q.priority} priority
                      </p>
                    </div>
                    <StatusBadge status={q.status} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No questions yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recommended next actions</CardTitle>
            </CardHeader>
            <CardContent>
              <RecommendedActionsList actions={actions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTrail entries={auditEntries} className="max-h-80" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
