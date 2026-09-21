import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AdversarialReviewChecklist } from "@/components/contradictions/adversarial-review-checklist"
import { ContradictionPanel } from "@/components/contradictions/contradiction-panel"
import { ResolutionStatusControl } from "@/components/contradictions/resolution-status-control"
import { MatterHeader } from "@/components/matters/matter-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelative, humanizeEnum } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ contradictionId: string }>
}): Promise<Metadata> {
  const { contradictionId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("contradictions").select("title").eq("id", contradictionId).maybeSingle()
  return { title: data?.title ?? "Contradiction" }
}

export default async function ContradictionDetailPage({
  params,
}: {
  params: Promise<{ matterId: string; contradictionId: string }>
}) {
  const { matterId, contradictionId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const { data: contradiction } = await supabase
    .from("contradictions")
    .select("*")
    .eq("id", contradictionId)
    .eq("matter_id", matterId)
    .maybeSingle()
  if (!contradiction) notFound()

  const [{ data: citedEvidence }, { data: review }, { data: evidence }] = await Promise.all([
    supabase
      .from("contradiction_evidence")
      .select("side, evidence:evidence!contradiction_evidence_evidence_matter_fkey(id, evidence_number, title)")
      .eq("contradiction_id", contradictionId),
    supabase.from("contradiction_reviews").select("*").eq("contradiction_id", contradictionId).maybeSingle(),
    supabase
      .from("evidence")
      .select("id, evidence_number, title")
      .eq("matter_id", matterId)
      .eq("is_excluded", false)
      .order("evidence_number", { ascending: true }),
  ])

  const sideAEvidence = (citedEvidence ?? [])
    .filter((c) => c.side === "a" && c.evidence)
    .map((c) => c.evidence as unknown as { id: string; evidence_number: string; title: string })
  const sideBEvidence = (citedEvidence ?? [])
    .filter((c) => c.side === "b" && c.evidence)
    .map((c) => c.evidence as unknown as { id: string; evidence_number: string; title: string })

  const evidenceOptions = (evidence ?? []).map((e) => ({ id: e.id, evidence_number: e.evidence_number, title: e.title }))

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Contradictions" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{contradiction.title}</h1>
          <p className="text-sm text-muted-foreground">{humanizeEnum(contradiction.conflict_type)} conflict</p>
        </div>
        <ResolutionStatusControl matterId={matterId} contradictionId={contradictionId} value={contradiction.resolution_status} />
      </div>

      <ContradictionPanel
        matterId={matterId}
        contradictionId={contradictionId}
        sideA={{ label: contradiction.side_a_label, summary: contradiction.side_a_summary, evidence: sideAEvidence }}
        sideB={{ label: contradiction.side_b_label, summary: contradiction.side_b_summary, evidence: sideBEvidence }}
        evidenceOptions={evidenceOptions}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-1">
          {contradiction.plausible_alternative_explanations ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Plausible alternative explanations</p>
              <p className="text-sm">{contradiction.plausible_alternative_explanations}</p>
            </div>
          ) : null}
          {contradiction.missing_evidence ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Missing evidence that could resolve this</p>
              <p className="text-sm">{contradiction.missing_evidence}</p>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {contradiction.impact_if_a ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Impact if {contradiction.side_a_label} is right</p>
                <p className="text-sm">{contradiction.impact_if_a}</p>
              </div>
            ) : null}
            {contradiction.impact_if_b ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Impact if {contradiction.side_b_label} is right</p>
                <p className="text-sm">{contradiction.impact_if_b}</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Adversarial review</CardTitle>
        </CardHeader>
        <CardContent>
          {review?.reviewed_at ? (
            <p className="mb-3 text-xs text-muted-foreground">Last saved {formatRelative(review.reviewed_at)}.</p>
          ) : (
            <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">
              Not yet reviewed — complete the checklist below.
            </p>
          )}
          <AdversarialReviewChecklist matterId={matterId} contradictionId={contradictionId} existing={review} />
        </CardContent>
      </Card>
    </div>
  )
}
