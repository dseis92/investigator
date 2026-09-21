"use client"

import { Plus } from "lucide-react"
import { useActionState, useState } from "react"

import { createSubject, type ActionState } from "@/app/matters/[matterId]/subjects/actions"
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
import { SUBJECT_TYPES } from "@/lib/domain"
import { humanizeEnum } from "@/lib/format"

export function CreateSubjectDialog({ matterId }: { matterId: string }) {
  const [open, setOpen] = useState(false)
  const action = createSubject.bind(null, matterId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New subject
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Add a subject</DialogTitle>
            <DialogDescription>People, businesses, accounts, documents, and other case entities.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject_type">Type</Label>
                <Select name="subject_type" defaultValue="person">
                  <SelectTrigger id="subject_type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {humanizeEnum(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Name / label</Label>
                <Input id="display_name" name="display_name" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea id="summary" name="summary" rows={3} />
            </div>
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
