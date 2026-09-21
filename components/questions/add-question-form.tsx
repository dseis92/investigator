"use client"

import { Plus } from "lucide-react"
import { useActionState } from "react"

import { createQuestion, type ActionState } from "@/app/matters/[matterId]/questions/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AddQuestionForm({ matterId }: { matterId: string }) {
  const action = createQuestion.bind(null, matterId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <label htmlFor="prompt" className="text-xs font-medium text-muted-foreground">
          New investigative question
        </label>
        <Input id="prompt" name="prompt" placeholder="Was the defendant present at the scene at 23:15?" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="priority" className="text-xs font-medium text-muted-foreground">
          Priority
        </label>
        <Select name="priority" defaultValue="medium">
          <SelectTrigger id="priority" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending}>
        <Plus />
        {isPending ? "Adding…" : "Add"}
      </Button>
      {state.error ? (
        <p role="alert" className="basis-full text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
