"use client"

import { CalendarDays, Check, Clock3, FileText, LockKeyhole, MapPin, ShieldCheck } from "lucide-react"
import { useMemo, useState } from "react"

import { submitClientPacketAction } from "@/app/matterpilot/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ClientPacketData = {
  packet: { id: string; expiresAt: string; status: string }
  appointment: { title: string; startsAt: string; endsAt: string; location: string; clientName: string }
  documents: {
    name: string
    content: string
    status: string
    fields?: { key: string; label: string; type: "text" | "email" | "date" | "textarea"; required: boolean; value: string }[]
    signature?: { id: string; status: "requested" | "signed"; required: boolean; signerName: string | null }
  }[]
}

function formatAppointmentDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(value))
}

function formatAppointmentTime(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
}

export function ClientPreparationPage({ token, packet }: { token: string; packet: ClientPacketData | null }) {
  const [fullName, setFullName] = useState(packet?.appointment.clientName ?? "")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [summary, setSummary] = useState("")
  const [goals, setGoals] = useState("")
  const [deadlines, setDeadlines] = useState("")
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => Object.fromEntries((packet?.documents ?? []).flatMap((document) => (document.fields ?? []).map((field) => [field.key, field.value]))))
  const [signatureName, setSignatureName] = useState("")
  const [signatureConsent, setSignatureConsent] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const appointmentLabel = useMemo(() => {
    if (!packet) return ""
    return `${formatAppointmentDate(packet.appointment.startsAt)} · ${formatAppointmentTime(packet.appointment.startsAt, packet.appointment.endsAt)}`
  }, [packet])

  if (!packet) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#f4f1eb] p-5 text-[#23313d]">
        <div className="w-full max-w-md rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-8 text-center shadow-xl shadow-[#23313d]/5">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#f2e2d8] text-[#a24f31]"><LockKeyhole className="size-5" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">Link unavailable</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">This packet is no longer active.</h1>
          <p className="mt-3 text-sm leading-6 text-[#737872]">The link may have expired, been completed, or been revoked. Please contact the firm for a new preparation link.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#f4f1eb] p-5 text-[#23313d]">
        <div className="w-full max-w-lg rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-8 text-center shadow-xl shadow-[#23313d]/5 sm:p-12">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-7" /></span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">Packet complete</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">Thank you, {fullName.split(" ")[0]}.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#737872]">Your information has been securely submitted to the firm. They will review the packet and follow up with next steps.</p>
          <div className="mt-7 rounded-xl bg-[#f1eee8] p-4 text-left"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b8d88]">Appointment</p><p className="mt-2 text-sm font-semibold text-[#23313d]">{packet.appointment.title}</p><p className="mt-1 text-xs text-[#737872]">{appointmentLabel}</p></div>
        </div>
      </div>
    )
  }

  async function submit() {
    setSubmitting(true)
    setError("")
    const result = await submitClientPacketAction({ token, fullName, email, phone, summary, goals, deadlines, engagementAcknowledged: acknowledged, fieldValues: { ...fieldValues, full_name: fullName, email, phone, matter_overview: summary, desired_outcome: goals, deadlines }, signatureName, signatureConsent })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSubmitted(true)
  }

  const intakeDocument = packet.documents.find((document) => document.name === "Intake questionnaire")
  const engagementDocument = packet.documents.find((document) => document.name === "Engagement letter")
  const signatureRequired = engagementDocument?.signature?.status === "requested"

  function renderFields(document: ClientPacketData["documents"][number]) {
    if (!document.fields?.length) return null
    return <div className="space-y-4 border-t border-[#eeeae3] px-4 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#b65f3a]">Fillable fields</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">These answers will be attached to this preparation document for the firm to review.</p></div>{document.fields.map((field) => <label key={field.key} className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">{field.label}{field.required ? <span className="ml-1 text-[#b65f3a]">*</span> : null}</span>{field.type === "textarea" ? <textarea value={fieldValues[field.key] ?? ""} onChange={(event) => setFieldValues((current) => ({ ...current, [field.key]: event.target.value }))} className="min-h-20 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a1a39d] focus:border-[#b65f3a]" /> : <Input type={field.type} value={fieldValues[field.key] ?? ""} onChange={(event) => setFieldValues((current) => ({ ...current, [field.key]: event.target.value }))} />}</label>)}</div>
  }

  return (
    <div className="min-h-svh bg-[#f4f1eb] text-[#23313d]">
      <header className="flex min-h-20 items-center justify-between border-b border-[#ded9d0] bg-[#fbfaf7] px-5 py-4 sm:px-10">
        <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#23313d] text-white"><CalendarDays className="size-4" /></span><span><span className="block font-serif text-lg font-semibold tracking-tight">MatterPilot</span><span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-[#8b8d88]">Harbor Legal</span></span></div>
        <span className="hidden items-center gap-2 text-xs text-[#8b8d88] sm:flex"><LockKeyhole className="size-4 text-emerald-600" /> Private preparation link</span>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-10 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="rounded-2xl bg-[#23313d] p-6 text-white shadow-xl shadow-[#23313d]/10 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5a083]">Before we meet</p>
            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight">A little preparation makes the first conversation count.</h1>
            <p className="mt-4 text-sm leading-6 text-[#b9c5ca]">Complete the secure packet below so the firm can understand what you need and use your appointment time well.</p>
            <div className="mt-8 space-y-4 text-xs text-[#c3ced1]"><div className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#d5a083]"><CalendarDays className="size-3.5" /></span><span><strong className="block text-white">{appointmentLabel}</strong><span className="mt-1 block text-[#9fb0b6]">{packet.appointment.title}</span></span></div><div className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#d5a083]"><MapPin className="size-3.5" /></span><span><strong className="block text-white">{packet.appointment.location}</strong><span className="mt-1 block text-[#9fb0b6]">Appointment location</span></span></div><div className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#d5a083]"><Clock3 className="size-3.5" /></span><span><strong className="block text-white">About 5 minutes</strong><span className="mt-1 block text-[#9fb0b6]">You can review your answers before submitting.</span></span></div></div>
            <div className="mt-10 border-t border-white/10 pt-5 text-xs leading-5 text-[#9fb0b6]"><ShieldCheck className="mb-2 size-4 text-emerald-400" />Your answers are sent directly to the firm through this private link. This page does not create an attorney-client relationship.</div>
          </aside>
          <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-xl shadow-[#23313d]/5 sm:p-8">
            <div className="border-b border-[#e8e3da] pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b65f3a]">Client preparation packet</p><h2 className="mt-2 font-serif text-2xl font-semibold">Tell us what we should know.</h2><p className="mt-1 text-sm leading-6 text-[#737872]">Required fields are marked by the form. You may leave anything uncertain blank and discuss it during the appointment.</p></div>
            <div className="mt-6 space-y-6">
              {intakeDocument ? <details open className="rounded-xl border border-[#e4ded5] bg-white"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3"><FileText className="size-4 text-[#b65f3a]" /><span className="flex-1 text-sm font-semibold">Intake questionnaire</span><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8d88]">Required</span></summary><div className="border-t border-[#eeeae3] px-4 py-3"><p className="whitespace-pre-wrap text-[11px] leading-5 text-[#737872]">{intakeDocument.content}</p></div>{renderFields(intakeDocument)}</details> : null}
              <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Full name</span><Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Email address</span><Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" /></label></div><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Phone number <span className="font-normal text-[#9b9d97]">(optional)</span></span><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(555) 555-5555" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">What happened?</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} className="min-h-24 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a1a39d] focus:border-[#b65f3a]" placeholder="Share the main facts in your own words." /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">What would you like help with?</span><textarea value={goals} onChange={(event) => setGoals(event.target.value)} className="min-h-20 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a1a39d] focus:border-[#b65f3a]" placeholder="What outcome are you hoping for?" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Deadlines or urgent concerns <span className="font-normal text-[#9b9d97]">(optional)</span></span><textarea value={deadlines} onChange={(event) => setDeadlines(event.target.value)} className="min-h-20 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a1a39d] focus:border-[#b65f3a]" placeholder="Court dates, notices, or anything time-sensitive." /></label></div>
              {engagementDocument ? <details className="rounded-xl border border-[#e4ded5] bg-white"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3"><FileText className="size-4 text-[#b65f3a]" /><span className="flex-1 text-sm font-semibold">Engagement letter</span><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8d88]">{signatureRequired ? "Signature requested" : "Review"}</span></summary><div className="border-t border-[#eeeae3] px-4 py-3"><p className="whitespace-pre-wrap text-[11px] leading-5 text-[#737872]">{engagementDocument.content}</p></div>{renderFields(engagementDocument)}{signatureRequired ? <div className="border-t border-[#eeeae3] px-4 py-4"><div className="rounded-xl border border-[#d8c7bb] bg-[#fffaf6] p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b604c]">Signature attestation</p><p className="mt-1 text-xs leading-5 text-[#737872]">The firm has requested a typed-name attestation for this engagement-letter draft. This is not a third-party e-signature service.</p><label className="mt-3 block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Type your full name</span><Input value={signatureName} onChange={(event) => setSignatureName(event.target.value)} placeholder="Your legal name" /></label><label className="mt-3 flex items-start gap-3 text-xs leading-5 text-[#5e655f]"><input type="checkbox" checked={signatureConsent} onChange={(event) => setSignatureConsent(event.target.checked)} className="mt-1 size-4 accent-[#b65f3a]" /><span>I agree that my typed name is an electronic signature attestation for this document and I consent to the firm recording the time and document version.</span></label></div></div> : null}</details> : null}
              <label className="flex items-start gap-3 rounded-xl border border-[#e4ded5] bg-[#f8f5ef] p-4"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 size-4 accent-[#b65f3a]" /><span className="text-xs leading-5 text-[#5e655f]">I confirm that the information above is accurate to the best of my knowledge, and I acknowledge that the engagement terms are for review. I understand that representation begins only when the firm accepts the engagement.</span></label>
              {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
              <Button className="w-full bg-[#b65f3a] hover:bg-[#9f5030]" disabled={submitting || !fullName.trim() || !email.trim() || !acknowledged || (signatureRequired && (!signatureName.trim() || !signatureConsent))} onClick={submit}>{submitting ? "Submitting securely…" : "Submit preparation packet"} <Check /></Button>
              <p className="text-center text-[11px] leading-5 text-[#9b9d97]">This link expires {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(packet.packet.expiresAt))} and can be used once.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
