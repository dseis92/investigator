"use client"

import { Plus } from "lucide-react"
import { useActionState, useState } from "react"

import { createEvent, type ActionState } from "@/app/matters/[matterId]/timeline/actions"
import type { EvidenceOption } from "@/components/evidence/evidence-link-dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { UNCERTAINTY_STATUSES } from "@/lib/domain"
import { humanizeEnum } from "@/lib/format"
import { useCloseDialogOnSuccess } from "@/lib/hooks/use-close-on-success"

export function AddEventForm({ matterId, evidenceOptions }: { matterId: string; evidenceOptions: EvidenceOption[] }) {
  const [open, setOpen] = useState(false)
  const action = createEvent.bind(null, matterId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })
  useCloseDialogOnSuccess(state, setOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            Add event
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Add a timeline event</DialogTitle>
            <DialogDescription>Build the chronology from dated evidence.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="event-title">Title</Label>
              <Input id="event-title" name="title" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="event_start">Start</Label>
                <Input id="event_start" name="event_start" type="datetime-local" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event_end">End (optional)</Label>
                <Input id="event_end" name="event_end" type="datetime-local" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="confidence">Confidence</Label>
                <Select name="confidence" defaultValue="reported">
                  <SelectTrigger id="confidence" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNCERTAINTY_STATUSES.filter((s) => s !== "superseded").map((s) => (
                      <SelectItem key={s} value={s}>
                        {humanizeEnum(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="favorability">Favorability</Label>
                <Select name="favorability" defaultValue="neutral">
                  <SelectTrigger id="favorability" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="favorable">Defense-favorable</SelectItem>
                    <SelectItem value="adverse">Adverse</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primary_evidence_id">Primary evidence</Label>
              <Select name="primary_evidence_id">
                <SelectTrigger id="primary_evidence_id" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {evidenceOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.evidence_number} — {e.title}
                    </SelectItem>
                  ))}
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
