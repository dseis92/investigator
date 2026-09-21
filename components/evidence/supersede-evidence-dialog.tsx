"use client"

import { History } from "lucide-react"
import { useActionState, useState } from "react"

import { supersedeEvidence, type ActionState } from "@/app/matters/[matterId]/evidence/actions"
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
import { useCloseDialogOnSuccess } from "@/lib/hooks/use-close-on-success"

export function SupersedeEvidenceDialog({
  matterId,
  evidenceId,
  options,
}: {
  matterId: string
  evidenceId: string
  options: { id: string; evidence_number: string; title: string }[]
}) {
  const [open, setOpen] = useState(false)
  const action = supersedeEvidence.bind(null, matterId, evidenceId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })
  useCloseDialogOnSuccess(state, setOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <History />
            Mark superseded
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Mark this evidence superseded</DialogTitle>
            <DialogDescription>
              This item stays in the ledger with full history and points to the corrected record — nothing is
              deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-4">
            <Label htmlFor="superseded_by">Superseded by</Label>
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other evidence items exist yet to supersede with.</p>
            ) : (
              <Select name="superseded_by">
                <SelectTrigger id="superseded_by" className="w-full">
                  <SelectValue placeholder="Select the corrected evidence item" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.evidence_number} — {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {state.error ? (
            <p role="alert" className="pb-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending || options.length === 0}>
              {isPending ? "Saving…" : "Mark superseded"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
