"use client"

import { useActionState } from "react"

import { addAnnotation, type ActionState } from "@/app/matters/[matterId]/evidence/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function AnnotationForm({ matterId, evidenceId }: { matterId: string; evidenceId: string }) {
  const action = addAnnotation.bind(null, matterId, evidenceId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  return (
    <form action={formAction} className="space-y-2">
      <Textarea name="body" rows={3} placeholder="Add an analyst note about this evidence…" required />
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "Adding…" : "Add annotation"}
      </Button>
    </form>
  )
}
