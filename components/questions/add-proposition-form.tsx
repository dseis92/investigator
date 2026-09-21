"use client"

import { Plus } from "lucide-react"
import { useActionState } from "react"

import { createProposition, type ActionState } from "@/app/matters/[matterId]/questions/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AddPropositionForm({ matterId, questionId }: { matterId: string; questionId: string }) {
  const action = createProposition.bind(null, matterId, questionId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <label htmlFor={`statement-${questionId}`} className="text-xs font-medium text-muted-foreground">
          New proposition
        </label>
        <Input
          id={`statement-${questionId}`}
          name="statement"
          placeholder="The defendant was still at work at 23:15."
          required
        />
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        <Plus />
        {isPending ? "Adding…" : "Add proposition"}
      </Button>
      {state.error ? (
        <p role="alert" className="basis-full text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
