import { Sparkles } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ReviewActions } from "@/components/analysis/review-actions"
import { ReviseAnalysisForm } from "@/components/analysis/revise-analysis-form"
import { MatterHeader } from "@/components/matters/matter-header"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/format"
import { canFinalizeAnalysis, getMatterRole } from "@/lib/matters/get-role"
import { createClient } from "@/lib/supabase/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ analysisId: string }>
}): Promise<Metadata> {
  const { analysisId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("analyses").select("title").eq("id", analysisId).maybeSingle()
  return { title: data?.title ?? "Analysis" }
}

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ matterId: string; analysisId: string }>
}) {
  const { matterId, analysisId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const { data: analysis } = await supabase
    .from("analyses")
    .select(
      "*, proposition:propositions!analyses_proposition_matter_fkey(id, statement), question:questions!analyses_question_matter_fkey(id, prompt)"
    )
    .eq("id", analysisId)
    .eq("matter_id", matterId)
    .maybeSingle()
  if (!analysis) notFound()

  const [{ data: conclusions }, role] = await Promise.all([
    supabase
      .from("analysis_conclusions")
      .select(
        "id, conclusion_text, classification, evidence:analysis_conclusion_evidence!analysis_conclusion_evidence_conclusion_matter_fkey(evidence:evidence!analysis_conclusion_evidence_evidence_matter_fkey(id, evidence_number, title))"
      )
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: true }),
    getMatterRole(matterId),
  ])

  const proposition = analysis.proposition as unknown as { id: string; statement: string } | null
  const question = analysis.question as unknown as { id: string; prompt: string } | null

  return (
    <div className="max-w-3xl space-y-6 pb-16">
      <MatterHeader matter={matter} section="Analysis" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{analysis.title}</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {analysis.generated_by === "ai" ? (
              <>
                <Sparkles className="size-3.5" />
                AI-drafted ({analysis.ai_model}) · generated {formatDateTime(analysis.created_at)}
              </>
            ) : (
              `Human-authored · ${formatDateTime(analysis.created_at)}`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={analysis.status} />
          <ReviewActions
            matterId={matterId}
            analysisId={analysisId}
            status={analysis.status}
            canReview={canFinalizeAnalysis(role)}
          />
        </div>
      </div>

      {analysis.generated_by === "ai" ? (
        <Card className="border-violet-600/30 bg-violet-50 dark:bg-violet-950/20">
          <CardContent className="text-sm text-violet-900 dark:text-violet-200">
            This is an AI-generated first pass, not a conclusion. It is grounded only in the evidence and statements
            already on record, cannot mark anything a verified fact, and requires explicit human approval before it
            counts as final analysis or report content.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {question ? <p className="text-muted-foreground">Question: {question.prompt}</p> : null}
          {proposition ? (
            <p>
              Proposition:{" "}
              <Link href={`/matters/${matterId}/questions`} className="underline-offset-2 hover:underline">
                {proposition.statement}
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Conclusions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {conclusions && conclusions.length > 0 ? (
            conclusions.map((c) => {
              const evidenceRefs = (c.evidence ?? [])
                .map((e) => e.evidence as unknown as { id: string; evidence_number: string; title: string } | null)
                .filter((e): e is { id: string; evidence_number: string; title: string } => Boolean(e))
              return (
                <div key={c.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">{c.conclusion_text}</p>
                    <StatusBadge status={c.classification} className="shrink-0" />
                  </div>
                  <div className="mt-1.5">
                    {evidenceRefs.length > 0 ? (
                      <ul className="flex flex-wrap gap-x-3 text-xs">
                        {evidenceRefs.map((e) => (
                          <li key={e.id}>
                            <Link
                              href={`/matters/${matterId}/evidence/${e.id}`}
                              className="underline-offset-2 hover:underline"
                            >
                              {e.evidence_number} — {e.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No specific evidence cited</p>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground">No individually classified conclusions recorded.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {analysis.status === "final" || analysis.status === "rejected" ? "Summary and notes" : "Revise draft"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReviseAnalysisForm matterId={matterId} analysis={analysis} />
        </CardContent>
      </Card>

      {analysis.key_assumptions ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Key assumptions:</span> {analysis.key_assumptions}
        </p>
      ) : null}
    </div>
  )
}
