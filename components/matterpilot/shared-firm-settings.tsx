"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Building2, CheckCircle2, Loader2, LockKeyhole } from "lucide-react"
import { connectFirmMattersAction, saveFirmSettingsAction } from "@/app/matterpilot/firm-actions"
import { Button } from "@/components/ui/button"
import { defaultFirmSettings, type FirmSettings, type SharedFirm } from "@/lib/matterpilot/firm-settings"

export type SharedFirmSettingsProps = {
  firms: { id: string; name: string }[]
  firm: SharedFirm | null
  canEdit: boolean
  eligibleMatters: { id: string; name: string; matter_number: string }[]
}

export function SharedFirmSettingsPanel({ firms, firm, canEdit, eligibleMatters }: SharedFirmSettingsProps) {
  const router = useRouter()
  const [settings, setSettings] = useState<FirmSettings>(firm ?? defaultFirmSettings)
  const [selectedMatters, setSelectedMatters] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const editable = !firm || canEdit
  function update<K extends keyof FirmSettings>(key: K, value: FirmSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value })); setMessage(""); setError("")
  }
  function save() {
    setError(""); setMessage("")
    startTransition(async () => {
      const result = await saveFirmSettingsAction({ firmId: firm?.id, updatedAt: firm?.updated_at, settings, matterIds: selectedMatters })
      if (!result.ok) { setError(result.error); return }
      setMessage("Shared firm settings saved.")
      router.replace(`/matterpilot/settings?section=firm&firmId=${result.firmId}`)
      router.refresh()
    })
  }
  function connect() {
    if (!firm) return
    setError(""); setMessage("")
    startTransition(async () => {
      const result = await connectFirmMattersAction({ firmId: firm.id, matterIds: selectedMatters })
      if (!result.ok) { setError(result.error); return }
      setSelectedMatters([]); setMessage("Selected matters now use the shared firm identity and defaults."); router.refresh()
    })
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3">{firms.length > 0 && <label className="text-xs font-semibold text-[#59645e]">Workspace<select aria-label="Firm workspace" value={firm?.id ?? ""} onChange={(event) => router.push(`/matterpilot/settings?section=firm&firmId=${event.target.value}`)} className="ml-3 rounded-lg border border-[#ded9d0] bg-white p-2 text-sm"><option value="">Create a new firm</option>{firms.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}{firm && <Link className="text-xs font-semibold text-[#b65f3a] underline" href="/matterpilot/settings?section=firm&newFirm=1">Create another firm</Link>}</div>
    <form onSubmit={(event) => { event.preventDefault(); save() }} className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3"><Building2 className="mt-1 size-5 text-[#b65f3a]" /><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b65f3a]">Shared workspace</p><h3 className="mt-1 font-serif text-2xl text-[#23313d]">{firm ? firm.name : "Set up your firm"}</h3><p className="mt-2 text-xs leading-5 text-[#63747a]">Everyone assigned to a connected matter sees the same business identity. Only firm administrators can edit it. Connecting a matter does not expand access to its records.</p></div></div>
      {!editable && <p className="mt-4 flex items-center gap-2 text-xs text-[#63747a]"><LockKeyhole className="size-4" />Read-only. Contact a firm administrator to change these settings.</p>}
      <fieldset disabled={!editable || pending} className="mt-5 space-y-5 disabled:opacity-70"><legend className="sr-only">Firm identity and defaults</legend>
        <div className="grid gap-4 sm:grid-cols-2">{([{ key: "name", label: "Firm name", type: "text" }, { key: "contact_email", label: "Contact email", type: "email" }, { key: "contact_phone", label: "Contact phone", type: "tel" }, { key: "website", label: "Website (https://)", type: "url" }, { key: "jurisdiction", label: "Default jurisdiction", type: "text" }, { key: "timezone", label: "Firm time zone", type: "text" }] as const).map((field) => <label className="text-xs font-semibold text-[#59645e]" key={field.key}>{field.label}<input required={field.key === "name" || field.key === "timezone"} value={settings[field.key]} type={field.type} onChange={(event) => update(field.key, event.target.value)} className="mt-2 w-full rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-sm text-[#23313d] focus:outline-[#b65f3a]" /></label>)}</div>
        <label className="block text-xs font-semibold text-[#59645e]">Office address<textarea value={settings.address} maxLength={1000} onChange={(event) => update("address", event.target.value)} className="mt-2 min-h-20 w-full rounded-lg border border-[#ded9d0] bg-white p-3 text-sm" /></label>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]"><label className="text-xs font-semibold text-[#59645e]">Brand accent<input type="color" value={settings.brand_color} onChange={(event) => update("brand_color", event.target.value)} className="mt-2 block h-10 w-full rounded-lg border border-[#ded9d0] bg-transparent" /></label><label className="text-xs font-semibold text-[#59645e]">Document footer<textarea value={settings.document_footer} maxLength={2000} onChange={(event) => update("document_footer", event.target.value)} className="mt-2 min-h-20 w-full rounded-lg border border-[#ded9d0] bg-white p-3 text-sm" /></label></div>
        <div className="border-t border-[#e8e3da] pt-5"><h4 className="text-sm font-semibold text-[#23313d]">Business hours</h4><p className="my-2 text-xs leading-5 text-[#63747a]">Used for connected matters that do not have custom availability. Editing a matter’s hours makes them its own override. Times use {settings.timezone}.</p><div className="space-y-2">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => {
          const dayNumber = index + 1; const hour = settings.business_hours.find((item) => item.day === dayNumber)
          return <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e8e3da] p-3" key={day}><label className="flex w-32 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={!!hour} onChange={(event) => update("business_hours", event.target.checked ? [...settings.business_hours, { day: dayNumber, start: "09:00", end: "17:00" }].sort((a, b) => a.day - b.day) : settings.business_hours.filter((item) => item.day !== dayNumber))} />{day}</label>{hour ? <><input aria-label={`${day} opens`} type="time" value={hour.start} onChange={(event) => update("business_hours", settings.business_hours.map((item) => item.day === dayNumber ? { ...item, start: event.target.value } : item))} className="rounded border border-[#ded9d0] bg-white p-2 text-xs" /><span className="text-xs text-[#63747a]">to</span><input aria-label={`${day} closes`} type="time" value={hour.end} onChange={(event) => update("business_hours", settings.business_hours.map((item) => item.day === dayNumber ? { ...item, end: event.target.value } : item))} className="rounded border border-[#ded9d0] bg-white p-2 text-xs" /></> : <span className="text-xs text-[#8b8d88]">Closed</span>}</div>
        })}</div></div>
        {!firm && eligibleMatters.length > 0 && <MatterChoices matters={eligibleMatters} selected={selectedMatters} onChange={setSelectedMatters} />}
        <Button type="submit">{pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {firm ? "Save firm settings" : "Create firm workspace"}</Button>
      </fieldset>
      <div className="mt-5 rounded-xl border border-[#e8e3da] bg-white p-4" style={{ borderTopColor: settings.brand_color, borderTopWidth: 3 }}><p className="font-serif text-xl text-[#23313d]">{settings.name || "Your firm"}</p><p className="mt-1 whitespace-pre-wrap text-xs text-[#63747a]">{[settings.contact_email, settings.contact_phone, settings.website, settings.address].filter(Boolean).join(" · ")}</p><p className="mt-3 whitespace-pre-wrap text-xs text-[#63747a]">{settings.document_footer || "Your contact details and footer appear in new document drafts and client preparation pages."}</p></div>
    </form>
    {firm && canEdit && eligibleMatters.length > 0 && <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 sm:p-7"><MatterChoices matters={eligibleMatters} selected={selectedMatters} onChange={setSelectedMatters} /><Button className="mt-4" disabled={pending || !selectedMatters.length} onClick={connect}>Connect selected matters</Button></section>}
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
  </div>
}

function MatterChoices({ matters, selected, onChange }: { matters: SharedFirmSettingsProps["eligibleMatters"]; selected: string[]; onChange: (value: string[]) => void }) {
  return <div><h4 className="text-sm font-semibold text-[#23313d]">Connect existing matters</h4><p className="my-2 text-xs leading-5 text-[#63747a]">Choose only this firm’s matters. Their assigned team can read firm settings, while matter permissions remain unchanged. Up to 50 eligible matters are shown at a time.</p><div className="max-h-52 space-y-2 overflow-auto">{matters.map((matter) => <label key={matter.id} className="flex items-center gap-3 rounded-lg border border-[#e8e3da] bg-white p-3 text-xs"><input type="checkbox" checked={selected.includes(matter.id)} onChange={(event) => onChange(event.target.checked ? [...selected, matter.id] : selected.filter((id) => id !== matter.id))} />{matter.name} · {matter.matter_number}</label>)}</div></div>
}
