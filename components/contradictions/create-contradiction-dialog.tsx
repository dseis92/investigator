"use client"

import { Plus } from "lucide-react"
import { useActionState, useState } from "react"

import { createContradiction, type ActionState } from "@/app/matters/[matterId]/contradictions/actions"
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

export function CreateContradictionDialog({ matterId }: { matterId: string }) {
  const [open, setOpen] = useState(false)
  const action = createContradiction.bind(null, matterId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            Log contradiction
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Log a contradiction</DialogTitle>
            <DialogDescription>
              Show both sides neutrally — this doesn&apos;t label either account true or false.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conflict_type">Conflict type</Label>
                <Select name="conflict_type" defaultValue="factual">
                  <SelectTrigger id="conflict_type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="factual">Factual</SelectItem>
                    <SelectItem value="temporal">Temporal</SelectItem>
                    <SelectItem value="testimonial">Testimonial</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Side A</p>
              <Input name="side_a_label" placeholder="Label, e.g. Defense witness account" required />
              <Textarea name="side_a_summary" placeholder="Summary of this side" rows={2} required />
            </div>
            <div className="grid gap-3 rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Side B</p>
              <Input name="side_b_label" placeholder="Label, e.g. Prosecution witness account" required />
              <Textarea name="side_b_summary" placeholder="Summary of this side" rows={2} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plausible_alternative_explanations">Plausible alternative explanations</Label>
              <Textarea id="plausible_alternative_explanations" name="plausible_alternative_explanations" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="missing_evidence">Missing evidence that could resolve this</Label>
              <Textarea id="missing_evidence" name="missing_evidence" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="impact_if_a">Impact if Side A is right</Label>
                <Textarea id="impact_if_a" name="impact_if_a" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="impact_if_b">Impact if Side B is right</Label>
                <Textarea id="impact_if_b" name="impact_if_b" rows={2} />
              </div>
            </div>

            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Log contradiction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
