"use client"

import { Sparkles } from "lucide-react"
import { useActionState, useState } from "react"

import { generateDraft, type ActionState } from "@/app/matters/[matterId]/analysis/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type PropositionOption = { id: string; statement: string; questionPrompt: string }

export function GenerateDraftDialog({
  matterId,
  propositions,
}: {
  matterId: string
  propositions: PropositionOption[]
}) {
  const [open, setOpen] = useState(false)
  const action = generateDraft.bind(null, matterId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Sparkles />
            Generate AI draft
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Generate an AI-assisted analysis draft</DialogTitle>
            <DialogDescription>
              The model drafts a first pass grounded only in the evidence and statements already linked to the
              selected proposition. It never invents sources, and it can never mark anything a verified fact — a
              human must explicitly approve or reject the draft before it counts as final.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-1.5">
              <Label htmlFor="proposition_id">Proposition to analyze</Label>
              {propositions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No propositions exist yet. Add a question and a proposition first.
                </p>
              ) : (
                <Select name="proposition_id">
                  <SelectTrigger id="proposition_id" className="w-full">
                    <SelectValue placeholder="Select a proposition" />
                  </SelectTrigger>
                  <SelectContent>
                    {propositions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.statement}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {state.error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || propositions.length === 0}>
              {isPending ? "Generating…" : "Generate draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
