"use client"

import { CircleSlash, RotateCcw } from "lucide-react"
import { useActionState, useState } from "react"
import { toast } from "sonner"

import { excludeEvidence, restoreEvidence, type ActionState } from "@/app/matters/[matterId]/evidence/actions"
import { RoleGate } from "@/components/role-gate"
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
import { Textarea } from "@/components/ui/textarea"
import { useCloseDialogOnSuccess } from "@/lib/hooks/use-close-on-success"

export function ExcludeEvidenceDialog({
  matterId,
  evidenceId,
  isExcluded,
  canExclude,
}: {
  matterId: string
  evidenceId: string
  isExcluded: boolean
  canExclude: boolean
}) {
  const [open, setOpen] = useState(false)
  const action = excludeEvidence.bind(null, matterId, evidenceId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })
  useCloseDialogOnSuccess(state, setOpen)

  if (isExcluded) {
    return (
      <RoleGate allowed={canExclude} reason="Your role does not permit restoring evidence.">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const result = await restoreEvidence(matterId, evidenceId)
            if (result?.error) toast.error(result.error)
          }}
        >
          <RotateCcw />
          Restore
        </Button>
      </RoleGate>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <RoleGate allowed={canExclude} reason="Your role does not permit excluding evidence.">
        <DialogTrigger
          render={
            <Button variant="destructive" size="sm">
              <CircleSlash />
              Exclude
            </Button>
          }
        />
      </RoleGate>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Exclude this evidence</DialogTitle>
            <DialogDescription>
              This marks the item excluded and records why. It stays in the ledger with full history — nothing is
              deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-4">
            <Label htmlFor="excluded_reason">Reason</Label>
            <Textarea id="excluded_reason" name="excluded_reason" rows={3} required />
          </div>
          {state.error ? (
            <p role="alert" className="pb-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Excluding…" : "Exclude evidence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
