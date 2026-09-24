"use client"

import { ArrowUpRight, Check, Plus, ShieldCheck, X } from "lucide-react"
import { useState } from "react"

import { createAppointmentAction, createCalendarNoteAction } from "@/app/matterpilot/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getWorkflow, getWorkflowDurationMinutes, WORKFLOW_OPTIONS } from "@/lib/matterpilot/workflows"
import { cn } from "@/lib/utils"

type Matter = { id: string; name: string; matter_number: string; case_mode: string; status: string }
type AppointmentSlot = { date: string; time: string }
const NEW_CLIENT_OPTION = "__new_client__"

export function AppointmentComposer({ matters, onClose, initialSlot }: { matters: Matter[]; onClose: () => void; initialSlot?: AppointmentSlot }) {
  const [step, setStep] = useState<"type" | "details" | "done">(initialSlot ? "details" : "type")
  const [selectedKey, setSelectedKey] = useState(initialSlot ? "quick_note" : "initial_consultation")
  const initialWorkflow = getWorkflow(initialSlot ? "quick_note" : "initial_consultation")
  const [title, setTitle] = useState<string>(initialWorkflow.defaultTitle)
  const [matterId, setMatterId] = useState(initialSlot ? "" : matters[0]?.id ?? NEW_CLIENT_OPTION)
  const [newClientCaseMode, setNewClientCaseMode] = useState<"criminal_defense" | "civil_defense">("criminal_defense")
  const [date, setDate] = useState(initialSlot?.date ?? "2026-09-22")
  const [time, setTime] = useState(initialSlot?.time ?? "13:00")
  const [location, setLocation] = useState<string>(initialWorkflow.defaultLocation)
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [repeat, setRepeat] = useState<"none" | "weekly" | "monthly">("none")
  const [repeatCount, setRepeatCount] = useState("4")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const workflow = getWorkflow(selectedKey)
  const isQuickNote = selectedKey === "quick_note"
  const isNewClientIntake = selectedKey === "initial_consultation" && matterId === NEW_CLIENT_OPTION

  function selectWorkflow(key: string) {
    const next = getWorkflow(key)
    setSelectedKey(next.key)
    setTitle(next.defaultTitle)
    setLocation(next.defaultLocation)
    if (next.key === "quick_note") setMatterId("")
    else if (next.key === "initial_consultation" && !matterId) setMatterId(matters[0]?.id ?? NEW_CLIENT_OPTION)
    else if (next.key !== "initial_consultation" && matterId === NEW_CLIENT_OPTION) setMatterId(matters[0]?.id ?? "")
    setError("")
  }

  async function save() {
    setSaving(true)
    setError("")
    const startsAt = new Date(`${date}T${time}:00`).toISOString()
    const endsAt = new Date(new Date(startsAt).getTime() + getWorkflowDurationMinutes(workflow.key) * 60 * 1000).toISOString()
    const result = isQuickNote
      ? await createCalendarNoteAction({ title, note: notes, startsAt, endsAt, matterId })
      : await createAppointmentAction({ matterId: isNewClientIntake ? "" : matterId, title, typeName: workflow.label, workflowKey: workflow.key, startsAt, endsAt, location, notes, clientName, clientEmail, newClientCaseMode, recurrence: repeat === "none" ? undefined : { frequency: repeat, interval: 1, count: Number(repeatCount) } })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setStep("done")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-[#15212c]/30 backdrop-blur-[2px] sm:p-4">
      <div className="flex h-full w-full max-w-md flex-col bg-[#fbfaf7] shadow-2xl sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#e8e3da] px-5 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b65f3a]">{isQuickNote ? "Calendar note" : "New appointment"}</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#23313d]">{isQuickNote ? "Capture it while it’s fresh" : "Put the matter in motion"}</h2></div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button>
        </div>

        {step === "type" ? <div className="flex-1 overflow-auto p-5"><p className="mb-4 text-sm text-[#737872]">Choose a repeatable workflow. MatterPilot will create the preparation checklist, document requests, participants, and reminders around it.</p><div className="space-y-2">{WORKFLOW_OPTIONS.map((item) => <button key={item.key} type="button" onClick={() => selectWorkflow(item.key)} className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors", selectedKey === item.key ? "border-[#b65f3a] bg-[#fff5ef] ring-1 ring-[#b65f3a]/20" : "border-[#e2ddd4] bg-white hover:border-[#b7b1a7]")}><span><span className="block text-sm font-semibold text-[#23313d]">{item.label}</span><span className="mt-0.5 block text-xs text-[#868a85]">{item.tag}</span></span><span className="text-xs font-medium text-[#868a85]">{item.duration}</span></button>)}</div><Button className="mt-6 w-full bg-[#23313d] hover:bg-[#18242e]" onClick={() => setStep("details")}>Continue <ArrowUpRight /></Button></div> : step === "details" ? <div className="flex-1 overflow-auto p-5">
          <label className="mb-5 block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Workflow</span><select value={selectedKey} onChange={(event) => selectWorkflow(event.target.value)} className="h-11 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 text-sm font-semibold text-[#23313d] outline-none focus:border-[#b65f3a]"><optgroup label="Legal workflows">{WORKFLOW_OPTIONS.filter((item) => item.key !== "quick_note").map((item) => <option key={item.key} value={item.key}>{item.label} · {item.duration}</option>)}</optgroup><optgroup label="Calendar utility"><option value="quick_note">Quick calendar note · No matter required</option></optgroup></select></label>
          <div className="mb-5 rounded-xl bg-[#f1eee8] p-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b8d88]">Workflow includes</p><p className="mt-1 text-sm font-semibold text-[#23313d]">{workflow.tasks.length ? `${workflow.tasks.length} prep tasks · ${workflow.documents.length} document requests` : "A private note at this date and time"}</p>{workflow.tasks.length ? <div className="mt-2 flex flex-wrap gap-1.5">{workflow.tasks.slice(0, 3).map((task) => <span key={task} className="rounded-full bg-white px-2 py-1 text-[10px] text-[#727b75]">{task}</span>)}</div> : null}</div>
          <div className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">{isQuickNote ? "Note title" : "Appointment title"}</span><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={workflow.defaultTitle} /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Matter <span className="font-normal text-[#9b9d97]">{isQuickNote ? "(optional)" : isNewClientIntake ? "(created automatically)" : "(required)"}</span></span><select value={matterId} onChange={(event) => setMatterId(event.target.value)} className="h-10 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 text-sm text-[#23313d] outline-none focus:border-[#b65f3a]">{isQuickNote ? <option value="">No matter — personal calendar note</option> : null}{workflow.key === "initial_consultation" ? <option value={NEW_CLIENT_OPTION}>New client — no matter yet</option> : null}{matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.name}</option>)}</select></label>
            {isNewClientIntake ? <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Practice area</span><select value={newClientCaseMode} onChange={(event) => setNewClientCaseMode(event.target.value as "criminal_defense" | "civil_defense")} className="h-10 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 text-sm text-[#23313d] outline-none focus:border-[#b65f3a]"><option value="criminal_defense">Criminal defense</option><option value="civil_defense">Civil defense</option></select><p className="mt-1.5 text-xs leading-5 text-[#868a85]">MatterPilot will create a private intake matter after you save this consultation.</p></label> : null}
            <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Date</span><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Time</span><Input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>
            {!isQuickNote && !isNewClientIntake ? <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Repeat</span><select value={repeat} onChange={(event) => setRepeat(event.target.value as "none" | "weekly" | "monthly")} className="h-10 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 text-sm text-[#23313d] outline-none focus:border-[#b65f3a]"><option value="none">Does not repeat</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></label>{repeat !== "none" ? <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Occurrences</span><select value={repeatCount} onChange={(event) => setRepeatCount(event.target.value)} className="h-10 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 text-sm text-[#23313d] outline-none focus:border-[#b65f3a]"><option value="2">2 appointments</option><option value="4">4 appointments</option><option value="8">8 appointments</option><option value="12">12 appointments</option></select></label> : <div />}</div> : null}
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">{isQuickNote ? "Calendar" : "Location"}</span><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={workflow.defaultLocation} /></label>
            {!isQuickNote ? <><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">{isNewClientIntake ? "Prospective client" : "Client, witness, or lead"} {isNewClientIntake ? <span className="font-normal text-[#b65f3a]">(required)</span> : null}</span><Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder={isNewClientIntake ? "Add the client’s name" : "Add a participant"} /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Participant email <span className="font-normal text-[#9b9d97]">(optional)</span></span><Input type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="client@example.com" /></label></> : null}
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">{isQuickNote ? "Note" : "Notes"} <span className="font-normal text-[#9b9d97]">{isQuickNote ? "(required)" : "(optional)"}</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a1a39d] focus:border-[#b65f3a]" placeholder={isQuickNote ? "What do you want to remember?" : "Agenda, preparation notes, or internal context"} /></label>
            <div className="rounded-xl border border-[#e4ded5] bg-white p-3"><div className="flex items-center gap-2 text-xs font-semibold text-[#5e655f]"><ShieldCheck className="size-4 text-emerald-600" />{isQuickNote ? "Saved to your calendar" : "Conflict check required before confirmation"}</div><p className="mt-1 pl-6 text-xs leading-5 text-[#868a85]">{isQuickNote ? "No matter is required. You can optionally link this note to one." : "The selected workflow will create the prep steps automatically."}</p></div>
            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setStep("type")}>Back</Button><Button className="bg-[#23313d] hover:bg-[#18242e]" disabled={saving || !title.trim() || (isQuickNote ? !notes.trim() : !matterId || (isNewClientIntake && !clientName.trim()))} onClick={save}>{saving ? "Saving…" : isQuickNote ? "Save note" : isNewClientIntake ? "Schedule intake" : "Create hold"} {isQuickNote ? <Check /> : <Plus />}</Button></div>
        </div> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-7" /></span><h2 className="mt-5 font-serif text-2xl font-semibold text-[#23313d]">{isQuickNote ? "Calendar note saved" : "Tentative hold created"}</h2><p className="mt-2 max-w-xs text-sm leading-6 text-[#737872]">{isQuickNote ? "Your note is on the calendar at the selected date and time." : "The selected workflow is ready with its prep tasks, document requests, and reminders."}</p><Button className="mt-6 bg-[#23313d] hover:bg-[#18242e]" onClick={onClose}>Back to calendar</Button></div>}
      </div>
    </div>
  )
}
