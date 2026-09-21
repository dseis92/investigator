"use client"

import { useActionState } from "react"

import { upsertContradictionReview, type ActionState } from "@/app/matters/[matterId]/contradictions/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const QUESTIONS: { name: string; label: string }[] = [
  { name: "weakest_assumption", label: "What assumption is weakest?" },
  { name: "evidence_against_theory", label: "What evidence cuts against the current theory?" },
  { name: "correlation_vs_causation", label: "Is correlation being treated as causation?" },
  { name: "absence_of_evidence_check", label: "Is absence of evidence being treated as evidence of absence?" },
  { name: "opposing_counsel_attack", label: "What would opposing counsel attack?" },
  { name: "fact_that_would_weaken_conclusion", label: "What fact would materially weaken the conclusion?" },
]

export function AdversarialReviewChecklist({
  matterId,
  contradictionId,
  existing,
}: {
  matterId: string
  contradictionId: string
  existing: Record<string, string | null> | null
}) {
  const action = upsertContradictionReview.bind(null, matterId, contradictionId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  return (
    <form action={formAction} className="space-y-4">
      {QUESTIONS.map((q) => (
        <div key={q.name} className="space-y-1.5">
          <Label htmlFor={q.name}>{q.label}</Label>
          <Textarea id={q.name} name={q.name} rows={2} defaultValue={existing?.[q.name] ?? ""} />
        </div>
      ))}
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save adversarial review"}
      </Button>
    </form>
  )
}
