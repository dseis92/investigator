"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { useActionState } from "react"

import { createMatter, type CreateMatterState } from "@/app/matters/actions"
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

export function CreateMatterDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState<CreateMatterState, FormData>(createMatter, { error: null })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New matter
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Create a matter</DialogTitle>
            <DialogDescription>Set up a new case workspace. You can fill in more detail later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matter_number">Matter number</Label>
                <Input id="matter_number" name="matter_number" placeholder="24-CR-04471" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="case_mode">Case mode</Label>
                <Select name="case_mode" defaultValue="criminal_defense">
                  <SelectTrigger id="case_mode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="criminal_defense">Criminal defense</SelectItem>
                    <SelectItem value="civil_defense">Civil defense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Matter name</Label>
              <Input id="name" name="name" placeholder="State v. Jane Doe" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input id="jurisdiction" name="jurisdiction" placeholder="County of Alameda" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input id="venue" name="venue" placeholder="Superior Court, Dept. 12" />
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
              {isPending ? "Creating…" : "Create matter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
