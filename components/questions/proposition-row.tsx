import Link from "next/link"

import { EvidenceLinkDialog, type EvidenceOption } from "@/components/evidence/evidence-link-dialog"
import { StatusBadge } from "@/components/status-badge"
import { humanizeEnum } from "@/lib/format"

export type PropositionRowData = {
  id: string
  statement: string
  status: string
  assumptions: string | null
  next_action: string | null
  supportingEvidence: { id: string; evidence_number: string; title: string }[]
  contradictingEvidence: { id: string; evidence_number: string; title: string }[]
  otherLinkCount: number
}

export function PropositionRow({
  matterId,
  proposition,
  evidenceOptions,
}: {
  matterId: string
  proposition: PropositionRowData
  evidenceOptions: EvidenceOption[]
}) {
  const hasNoEvidence =
    proposition.supportingEvidence.length === 0 &&
    proposition.contradictingEvidence.length === 0 &&
    proposition.otherLinkCount === 0

  return (
    <div className="space-y-2.5 rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm">{proposition.statement}</p>
        <StatusBadge status={proposition.status} className="shrink-0" />
      </div>

      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <p className="mb-1 font-medium text-muted-foreground">Supporting evidence</p>
          {proposition.supportingEvidence.length > 0 ? (
            <ul className="space-y-0.5">
              {proposition.supportingEvidence.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/matters/${matterId}/evidence/${e.id}`}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {e.evidence_number} — {e.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">None linked</p>
          )}
        </div>
        <div>
          <p className="mb-1 font-medium text-muted-foreground">Contradicting evidence</p>
          {proposition.contradictingEvidence.length > 0 ? (
            <ul className="space-y-0.5">
              {proposition.contradictingEvidence.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/matters/${matterId}/evidence/${e.id}`}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {e.evidence_number} — {e.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">None linked</p>
          )}
        </div>
      </div>

      {proposition.assumptions ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Assumptions:</span> {proposition.assumptions}
        </p>
      ) : null}
      {proposition.next_action ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Next action:</span> {proposition.next_action}
        </p>
      ) : null}
      {hasNoEvidence ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Missing evidence — nothing has been linked to this proposition yet.
        </p>
      ) : null}

      <div className="flex items-center gap-2 pt-1">
        <EvidenceLinkDialog matterId={matterId} propositionId={proposition.id} evidenceOptions={evidenceOptions} />
        <span className="text-xs text-muted-foreground">{humanizeEnum(proposition.status)}</span>
      </div>
    </div>
  )
}
