import { Sparkles } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { EmptyState } from "@/components/empty-state"
import { GenerateDraftDialog, type PropositionOption } from "@/components/analysis/generate-draft-dialog"
import { MatterHeader } from "@/components/matters/matter-header"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelative } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Analysis" }

const STATUS_GROUPS = [
  { status: "draft", label: "Drafts awaiting review" },
  { status: "under_review", label: "Under review" },
  { status: "final", label: "Final" },
  { status: "rejected", label: "Rejected" },
] as const

export default async function AnalysisPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const [{ data: analyses }, { data: propositionRows }] = await Promise.all([
    supabase
      .from("analyses")
      .select("id, title, summary, status, generated_by, ai_model, created_at")
      .eq("matter_id", matterId)
      .order("created_at", { ascending: false }),
    supabase
      .from("propositions")
      .select("id, statement, question:questions!propositions_question_matter_fkey(prompt)")
      .eq("matter_id", matterId)
      .order("created_at", { ascending: true }),
  ])

  const propositions: PropositionOption[] = (propositionRows ?? []).map((p) => ({
    id: p.id,
    statement: p.statement,
    questionPrompt: (p.question as unknown as { prompt: string } | null)?.prompt ?? "",
  }))

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Analysis" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          AI-assisted first-pass drafts, always evidence-grounded and always reviewed by a human before they count as
          final.
        </p>
        <GenerateDraftDialog matterId={matterId} propositions={propositions} />
      </div>

      {analyses && analyses.length > 0 ? (
        <div className="space-y-6">
          {STATUS_GROUPS.map((group) => {
            const items = analyses.filter((a) => a.status === group.status)
            if (items.length === 0) return null
            return (
              <div key={group.status}>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{group.label}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((a) => (
                    <Link key={a.id} href={`/matters/${matterId}/analysis/${a.id}`}>
                      <Card className="h-full transition-colors hover:bg-muted/40">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm font-medium">{a.title}</CardTitle>
                            <StatusBadge status={a.status} className="shrink-0" />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm text-muted-foreground">
                          <p className="line-clamp-2">{a.summary}</p>
                          <p className="flex items-center gap-1 text-xs">
                            {a.generated_by === "ai" ? (
                              <>
                                <Sparkles className="size-3" />
                                AI-drafted ({a.ai_model})
                              </>
                            ) : (
                              "Human-authored"
                            )}{" "}
                            · {formatRelative(a.created_at)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No analysis drafted yet"
          description="Generate an AI-assisted first pass on a proposition, or come back once propositions have evidence linked."
        />
      )}
    </div>
  )
}
