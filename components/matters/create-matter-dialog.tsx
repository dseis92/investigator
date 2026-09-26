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
import type { MatterStarterTemplate } from "@/lib/matterpilot/customizations"

const blankTemplateValue = "__blank_matter_template__"

export function CreateMatterDialog({ matterTemplates = [] }: { matterTemplates?: MatterStarterTemplate[] }) {
  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState(blankTemplateValue)
  const [caseMode, setCaseMode] = useState<MatterStarterTemplate["caseMode"]>("criminal_defense")
  const [jurisdiction, setJurisdiction] = useState("")
  const [venue, setVenue] = useState("")
  const [state, formAction, isPending] = useActionState<CreateMatterState, FormData>(createMatter, { error: null })
  const activeMatterTemplates = matterTemplates.filter((template) => template.active)
  const selectedTemplate = activeMatterTemplates.find((template) => template.id === templateId)

  function applyTemplate(value: string | null) {
    const nextValue = value ?? blankTemplateValue
    setTemplateId(nextValue)
    const template = activeMatterTemplates.find((candidate) => candidate.id === nextValue)
    if (!template) {
      setCaseMode("criminal_defense")
      setJurisdiction("")
      setVenue("")
      return
    }
    setCaseMode(template.caseMode)
    setJurisdiction(template.jurisdiction)
    setVenue(template.venue)
  }

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
            {activeMatterTemplates.length ? (
              <div className="space-y-2">
                <Label htmlFor="matter_template">Starter template</Label>
                <Select value={templateId} onValueChange={applyTemplate}>
                  <SelectTrigger id="matter_template" className="w-full">
                    <SelectValue placeholder="Start from a blank matter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={blankTemplateValue}>Start from a blank matter</SelectItem>
                    {activeMatterTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedTemplate ? <p className="text-xs leading-5 text-[#8b8d88]">Prefills the case mode, jurisdiction, and venue below. You can still change any value before creating the matter.</p> : null}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matter_number">Matter number</Label>
                <Input id="matter_number" name="matter_number" placeholder="24-CR-04471" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="case_mode">Case mode</Label>
                <Select name="case_mode" value={caseMode} onValueChange={(value) => setCaseMode(value as MatterStarterTemplate["caseMode"])}>
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
                <Input id="jurisdiction" name="jurisdiction" value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} placeholder="County of Alameda" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input id="venue" name="venue" value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Superior Court, Dept. 12" />
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
