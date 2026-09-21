import Link from "next/link"

import { AddContradictionEvidenceForm } from "@/components/contradictions/add-contradiction-evidence-form"
import type { EvidenceOption } from "@/components/evidence/evidence-link-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Side = {
  label: string
  summary: string
  evidence: { id: string; evidence_number: string; title: string }[]
}

export function ContradictionPanel({
  matterId,
  contradictionId,
  sideA,
  sideB,
  evidenceOptions,
}: {
  matterId: string
  contradictionId: string
  sideA: Side
  sideB: Side
  evidenceOptions: EvidenceOption[]
}) {
  const columns: { key: "a" | "b"; side: Side }[] = [
    { key: "a", side: sideA },
    { key: "b", side: sideB },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {columns.map(({ key, side }) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-sm">{side.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{side.summary}</p>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Cited evidence</p>
              {side.evidence.length > 0 ? (
                <ul className="space-y-0.5">
                  {side.evidence.map((e) => (
                    <li key={e.id} className="text-sm">
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
                <p className="text-sm text-muted-foreground">No evidence cited yet.</p>
              )}
            </div>
            <AddContradictionEvidenceForm
              matterId={matterId}
              contradictionId={contradictionId}
              side={key}
              evidenceOptions={evidenceOptions}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
