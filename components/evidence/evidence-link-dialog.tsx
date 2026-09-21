"use client"

import { Link2 } from "lucide-react"
import { useActionState, useState } from "react"

import { linkEvidenceToProposition, type ActionState } from "@/app/matters/[matterId]/questions/actions"
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

export type EvidenceOption = { id: string; evidence_number: string; title: string }

export function EvidenceLinkDialog({
  matterId,
  propositionId,
  evidenceOptions,
}: {
  matterId: string
  propositionId: string
  evidenceOptions: EvidenceOption[]
}) {
  const [open, setOpen] = useState(false)
  const action = linkEvidenceToProposition.bind(null, matterId, propositionId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })
  useCloseDialogOnSuccess(state, setOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Link2 />
            Link evidence
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Link evidence to this proposition</DialogTitle>
            <DialogDescription>Choose an evidence item and how it relates to this proposition.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`evidence-${propositionId}`}>Evidence</Label>
              {evidenceOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No evidence captured yet. Add evidence to the ledger first.
                </p>
              ) : (
                <Select name="evidence_id">
                  <SelectTrigger id={`evidence-${propositionId}`} className="w-full">
                    <SelectValue placeholder="Select evidence" />
                  </SelectTrigger>
                  <SelectContent>
                    {evidenceOptions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.evidence_number} — {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`relationship-${propositionId}`}>Relationship</Label>
              <Select name="relationship" defaultValue="supports">
                <SelectTrigger id={`relationship-${propositionId}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supports">Supports</SelectItem>
                  <SelectItem value="contradicts">Contradicts</SelectItem>
                  <SelectItem value="mentions">Mentions</SelectItem>
                  <SelectItem value="authenticates">Authenticates</SelectItem>
                  <SelectItem value="establishes_provenance">Establishes provenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || evidenceOptions.length === 0}>
              {isPending ? "Linking…" : "Link evidence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
