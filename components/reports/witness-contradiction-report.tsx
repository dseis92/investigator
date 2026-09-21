import Link from "next/link"

import { StatusBadge } from "@/components/status-badge"
import { formatDate, humanizeEnum } from "@/lib/format"

export type ReportEvidenceRef = {
  id: string
  evidence_number: string
  title: string
  source_locator: string | null
  event_date: string | null
  provenance_status: string
}

export type WitnessStatementEntry = {
  id: string
  content: string
  statementDate: string | null
  status: string
  sourceEvidence: ReportEvidenceRef
  corroborating: ReportEvidenceRef[]
  contradicting: ReportEvidenceRef[]
}

export type WitnessContradictionEntry = {
  id: string
  title: string
  conflictType: string
  ownLabel: string
  ownSummary: string
  otherLabel: string
  otherSummary: string
  resolutionStatus: string
  plausibleAlternativeExplanations: string | null
  missingEvidence: string | null
  ownSideEvidence: ReportEvidenceRef[]
  otherSideEvidence: ReportEvidenceRef[]
  unresolvedCredibilityQuestions: string[]
  examinationTopics: string[]
}

export type WitnessReportEntry = {
  subjectId: string
  displayName: string
  subjectType: string
  summary: string | null
  statements: WitnessStatementEntry[]
  contradictions: WitnessContradictionEntry[]
}

function EvidenceList({ matterId, items, emptyLabel }: { matterId: string; items: ReportEvidenceRef[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">{emptyLabel}</p>
  }
  return (
    <ul className="space-y-1">
      {items.map((e) => (
        <li key={e.id} className="text-xs">
          <Link href={`/matters/${matterId}/evidence/${e.id}`} className="font-medium underline-offset-2 hover:underline">
            {e.evidence_number}
          </Link>{" "}
          — {e.title}
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

export function WitnessContradictionReport({ matterId, witnesses }: { matterId: string; witnesses: WitnessReportEntry[] }) {
  return (
    <div className="space-y-6 print:space-y-4">
      {witnesses.map((witness) => (
        <div key={witness.subjectId} className="print-avoid-break space-y-4 rounded-md border border-border p-4 print:border-black">
          <div>
            <h2 className="text-base font-semibold">{witness.displayName}</h2>
            <p className="text-xs text-muted-foreground">
              {humanizeEnum(witness.subjectType)}
              {witness.summary ? ` — ${witness.summary}` : ""}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold">Statements, by date and source</p>
            {witness.statements.length > 0 ? (
              <div className="space-y-3">
                {witness.statements.map((s) => (
                  <div key={s.id} className="rounded-md border border-border/70 p-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm">{s.content}</p>
                      <StatusBadge status={s.status} className="shrink-0" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(s.statementDate)} · Source:{" "}
                      <Link href={`/matters/${matterId}/evidence/${s.sourceEvidence.id}`} className="underline-offset-2 hover:underline">
                        {s.sourceEvidence.evidence_number} — {s.sourceEvidence.title}
                      </Link>
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Corroborating evidence</p>
                        <EvidenceList matterId={matterId} items={s.corroborating} emptyLabel="None on record" />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Contradictory evidence</p>
                        <EvidenceList matterId={matterId} items={s.contradicting} emptyLabel="None on record" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No statements on record for this witness.</p>
            )}
          </div>

          {witness.contradictions.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold">Materially different descriptions of the same event</p>
              <div className="space-y-3">
                {witness.contradictions.map((c) => (
                  <div key={c.id} className="rounded-md border border-border/70 p-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{c.title}</p>
                      <StatusBadge status={c.resolutionStatus} className="shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {humanizeEnum(c.conflictType)} conflict — materially different descriptions were identified
                      between {c.ownLabel} and {c.otherLabel}.
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium">{c.ownLabel} (this witness)</p>
                        <p className="text-xs">{c.ownSummary}</p>
                        <EvidenceList matterId={matterId} items={c.ownSideEvidence} emptyLabel="No evidence cited" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{c.otherLabel}</p>
                        <p className="text-xs">{c.otherSummary}</p>
                        <EvidenceList matterId={matterId} items={c.otherSideEvidence} emptyLabel="No evidence cited" />
                      </div>
                    </div>
                    {c.plausibleAlternativeExplanations ? (
                      <p className="mt-2 text-xs">
                        <span className="font-medium text-muted-foreground">Plausible alternative explanations: </span>
                        {c.plausibleAlternativeExplanations}
                      </p>
                    ) : null}
                    {c.missingEvidence ? (
                      <p className="text-xs">
                        <span className="font-medium text-muted-foreground">Missing evidence that could resolve this: </span>
                        {c.missingEvidence}
                      </p>
                    ) : null}
                    {c.unresolvedCredibilityQuestions.length > 0 ? (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground">Unresolved questions (stated neutrally)</p>
                        <ul className="list-inside list-disc text-xs">
                          {c.unresolvedCredibilityQuestions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {c.examinationTopics.length > 0 ? (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground">Suggested examination topics</p>
                        <ul className="list-inside list-disc text-xs">
                          {c.examinationTopics.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
