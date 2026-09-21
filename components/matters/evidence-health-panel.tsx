import { cn } from "@/lib/utils"
import type { MatterHealthSummary } from "@/lib/matters/recommended-actions"

function StatTile({ label, value, tone }: { label: string; value: number; tone: "warn" | "neutral" }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "warn" && value > 0 ? "text-amber-700 dark:text-amber-400" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function EvidenceHealthPanel({ summary }: { summary: MatterHealthSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Missing evidence on propositions" value={summary.propositionsMissingEvidence} tone="warn" />
      <StatTile label="Unresolved contradictions" value={summary.unresolvedContradictions} tone="warn" />
      <StatTile label="Weak-provenance evidence" value={summary.weakProvenanceEvidenceCount} tone="warn" />
      <StatTile label="Stale evidence (14d+)" value={summary.staleEvidenceCount} tone="warn" />
    </div>
  )
}
