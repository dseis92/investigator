import { StatusBadge } from "@/components/status-badge"
import { formatDate } from "@/lib/format"

export type MatrixEvidenceRef = {
  evidence_number: string
  title: string
  source_locator: string | null
  event_date: string | null
  provenance_status: string
}

export type MatrixRow = {
  questionPrompt: string
  statement: string
  status: string
  assumptions: string | null
  nextAction: string | null
  supporting: MatrixEvidenceRef[]
  contradicting: MatrixEvidenceRef[]
}

function EvidenceList({ items }: { items: MatrixEvidenceRef[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">None on record</p>
  }
  return (
    <ul className="space-y-1">
      {items.map((e) => (
        <li key={e.evidence_number} className="text-xs">
          <span className="font-medium">{e.evidence_number}</span> — {e.title}
          {e.source_locator ? <span className="text-muted-foreground"> ({e.source_locator})</span> : null}
          <span className="text-muted-foreground">
            {" "}
            · {formatDate(e.event_date)} · <StatusBadge status={e.provenance_status} className="ml-0.5 align-middle" />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function PropositionEvidenceMatrixTable({ rows }: { rows: MatrixRow[] }) {
  return (
    <div className="space-y-4 print:space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="print-avoid-break rounded-md border border-border p-3 print:border-black">
          <p className="mb-1 text-xs text-muted-foreground">{row.questionPrompt}</p>
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{row.statement}</p>
            <StatusBadge status={row.status} className="shrink-0" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold">Supporting evidence</p>
              <EvidenceList items={row.supporting} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold">Contradicting evidence</p>
              <EvidenceList items={row.contradicting} />
            </div>
          </div>
          {row.assumptions ? (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Assumptions:</span> {row.assumptions}
            </p>
          ) : null}
          {row.nextAction ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Analyst next action:</span> {row.nextAction}
            </p>
          ) : null}
          {row.supporting.length === 0 && row.contradicting.length === 0 ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Limitation: no evidence has been linked to this proposition. Status shown reflects analyst assertion
              only, not evidentiary support.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
