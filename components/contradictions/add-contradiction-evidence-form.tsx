"use client"

import { Link2 } from "lucide-react"
import { useActionState } from "react"

import { addContradictionEvidence, type ActionState } from "@/app/matters/[matterId]/contradictions/actions"
import type { EvidenceOption } from "@/components/evidence/evidence-link-dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AddContradictionEvidenceForm({
  matterId,
  contradictionId,
  side,
  evidenceOptions,
}: {
  matterId: string
  contradictionId: string
  side: "a" | "b"
  evidenceOptions: EvidenceOption[]
}) {
  const action = addContradictionEvidence.bind(null, matterId, contradictionId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  if (evidenceOptions.length === 0) return null

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="side" value={side} />
      <Select name="evidence_id">
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Cite evidence for this side" />
        </SelectTrigger>
        <SelectContent>
          {evidenceOptions.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.evidence_number} — {e.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="icon-sm" variant="outline" disabled={isPending} aria-label="Cite evidence">
        <Link2 />
      </Button>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
