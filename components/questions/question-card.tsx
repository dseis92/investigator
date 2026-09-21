import { AddPropositionForm } from "@/components/questions/add-proposition-form"
import { PropositionRow, type PropositionRowData } from "@/components/questions/proposition-row"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EvidenceOption } from "@/components/evidence/evidence-link-dialog"

export function QuestionCard({
  matterId,
  question,
  propositions,
  evidenceOptions,
}: {
  matterId: string
  question: { id: string; prompt: string; priority: string; status: string; ownerName: string | null }
  propositions: PropositionRowData[]
  evidenceOptions: EvidenceOption[]
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-medium">{question.prompt}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {question.ownerName ?? "Unassigned"} · {question.priority} priority
            </p>
          </div>
          <StatusBadge status={question.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {propositions.length > 0 ? (
          propositions.map((p) => (
            <PropositionRow key={p.id} matterId={matterId} proposition={p} evidenceOptions={evidenceOptions} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No propositions yet — decompose this question into testable factual claims below.
          </p>
        )}
        <AddPropositionForm matterId={matterId} questionId={question.id} />
      </CardContent>
    </Card>
  )
}
