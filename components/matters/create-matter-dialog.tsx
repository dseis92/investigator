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

export type FirmChoice = { id: string; name: string; jurisdiction: string }
export function CreateMatterDialog({ matterTemplates = [], firms = [] }: { matterTemplates?: MatterStarterTemplate[]; firms?: FirmChoice[] }) {
  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState(blankTemplateValue)
  const [caseMode, setCaseMode] = useState<MatterStarterTemplate["caseMode"]>("criminal_defense")
  const [jurisdiction, setJurisdiction] = useState("")
  const [firmId, setFirmId] = useState("")
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
      setJurisdiction(firms.find((firm) => firm.id === firmId)?.jurisdiction ?? "")
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
            <DialogDescription>Set up a new case workspace. Choose an onboarding kit to create the first questions, tasks, and document requests automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {firms.length > 0 && <label className="space-y-2 text-sm font-medium">Firm workspace<select name="firm_id" value={firmId} onChange={(event) => { setFirmId(event.target.value); setJurisdiction(firms.find((firm) => firm.id === event.target.value)?.jurisdiction ?? "") }} className="mt-2 w-full rounded-lg border border-[#ded9d0] bg-white p-3"><option value="">Independent matter</option>{firms.map((firm) => <option key={firm.id} value={firm.id}>{firm.name}</option>)}</select></label>}
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
            <input type="hidden" name="onboarding_template_id" value={selectedTemplate?.id ?? ""} />
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
            <div className="rounded-xl border border-[#eadbd0] bg-[#fffaf6] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b604c]">Client identity <span className="font-normal normal-case tracking-normal text-[#a1a39d]">optional</span></p>
              <p className="mt-1 text-xs leading-5 text-[#8b8d88]">Add the prospective client now to create the contact and start the conflict review automatically.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="client_name">Client name</Label><Input id="client_name" name="client_name" placeholder="Jane Doe" /></div>
                <div className="space-y-2"><Label htmlFor="client_email">Email</Label><Input id="client_email" name="client_email" type="email" placeholder="jane@example.com" /></div>
                <div className="space-y-2"><Label htmlFor="client_phone">Phone</Label><Input id="client_phone" name="client_phone" placeholder="(312) 555-0144" /></div>
              </div>
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
