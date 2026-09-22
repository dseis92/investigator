"use client"

import { useActionState } from "react"

import { updateAnalysisDraft, type ActionState } from "@/app/matters/[matterId]/analysis/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Analysis } from "@/lib/domain"

export function ReviseAnalysisForm({ matterId, analysis }: { matterId: string; analysis: Analysis }) {
  const action = updateAnalysisDraft.bind(null, matterId, analysis.id)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  const locked = analysis.status === "final" || analysis.status === "rejected"

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="summary">Summary</Label>
        <Textarea id="summary" name="summary" rows={2} defaultValue={analysis.summary} disabled={locked} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contradicting_evidence_summary">Contradictory / adverse evidence</Label>
        <Textarea
          id="contradicting_evidence_summary"
          name="contradicting_evidence_summary"
          rows={2}
          defaultValue={analysis.contradicting_evidence_summary ?? ""}
          disabled={locked}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="missing_evidence_summary">Unknowns and limitations</Label>
        <Textarea
          id="missing_evidence_summary"
          name="missing_evidence_summary"
          rows={2}
          defaultValue={analysis.missing_evidence_summary ?? ""}
          disabled={locked}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="recommended_next_steps">Suggested next human-verifiable action</Label>
        <Textarea
          id="recommended_next_steps"
          name="recommended_next_steps"
          rows={2}
          defaultValue={analysis.recommended_next_steps ?? ""}
          disabled={locked}
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {!locked ? (
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Saving…" : "Save revision"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          This analysis is {analysis.status} and can no longer be revised.
        </p>
      )}
    </form>
  )
}
