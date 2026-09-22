"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileText, KeyRound, LogOut, ShieldCheck } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ClientPortalHomeData = {
  email: string
  matters: {
    id: string
    name: string
    matterNumber: string
    status: string
    appointments: {
      id: string
      title: string
      startsAt: string
      endsAt: string
      location: string
      status: string
      documents: {
        id: string
        name: string
        content: string
        fields: { key: string; label: string; type: string; required: boolean; value: string }[]
      }[]
    }[]
  }[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(value))
}

function formatTime(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
}

export function ClientPortalPage({ userEmail, home }: { userEmail: string | null; home: ClientPortalHomeData | null }) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState(userEmail ?? "")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function requestCode() {
    setPending(true)
    setError("")
    const normalizedEmail = email.trim().toLowerCase()
    const { error: requestError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    })
    setPending(false)
    if (requestError) {
      setError(requestError.message)
      return
    }
    setEmail(normalizedEmail)
    setStep("code")
  }

  async function verifyCode() {
    setPending(true)
    setError("")
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" })
    setPending(false)
    if (verifyError) {
      setError(verifyError.message)
      return
    }
    router.refresh()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (!userEmail) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#f4f1eb] p-5 text-[#23313d]">
        <section className="w-full max-w-md rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-8 shadow-xl shadow-[#23313d]/5 sm:p-10">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><ShieldCheck className="size-6" /></div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">MatterPilot client portal</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">Your matter, in one place.</h1>
          <p className="mt-3 text-sm leading-6 text-[#737872]">Enter the email address your legal team has on file. We’ll send a one-time verification code before showing any matter information.</p>
          <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); void requestCode() }}>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Email address</span><Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required className="border-[#d8c7bb] bg-white" /></label>
            {step === "code" ? <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Verification code</span><Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter the code from your email" required className="border-[#d8c7bb] bg-white tracking-[0.2em]" /></label> : null}
            {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
            {step === "code" ? <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setStep("email"); setCode("") }} className="border-[#d8c7bb] text-[#6d716c]">Change email</Button><Button type="button" onClick={() => void verifyCode()} disabled={pending || code.trim().length < 4} className="flex-1 bg-[#a24f31] hover:bg-[#8f432a]">{pending ? "Verifying…" : "Open portal"}<KeyRound /></Button></div> : <Button type="submit" disabled={pending || !email.trim()} className="w-full bg-[#a24f31] hover:bg-[#8f432a]">{pending ? "Sending code…" : "Send verification code"}<KeyRound /></Button>}
          </form>
          {step === "code" ? <p className="mt-4 text-center text-xs leading-5 text-[#8b8d88]">Check your inbox for a six-digit code. It may take a minute to arrive.</p> : null}
        </section>
      </main>
    )
  }

  if (!home || home.matters.length === 0) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#f4f1eb] p-5 text-[#23313d]">
        <section className="w-full max-w-md rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-8 text-center shadow-xl shadow-[#23313d]/5 sm:p-10">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#f2e2d8] text-[#a24f31]"><ShieldCheck className="size-6" /></div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">Verified email</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">Access is not active yet.</h1>
          <p className="mt-3 text-sm leading-6 text-[#737872]">Your email is verified, but the firm has not enabled a client portal matter for <span className="font-semibold text-[#4d5851]">{userEmail}</span>. Please contact your legal team.</p>
          <Button variant="outline" onClick={() => void signOut()} className="mt-7 border-[#d8c7bb] text-[#6d716c]">Sign out <LogOut /></Button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[#f4f1eb] text-[#23313d]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-5 border-b border-[#ded9d0] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">MatterPilot client portal</p><h1 className="mt-2 font-serif text-4xl font-semibold">Welcome back.</h1><p className="mt-2 text-sm text-[#737872]">Secure access for {home.email}</p></div>
          <Button variant="outline" onClick={() => void signOut()} className="w-fit border-[#d8c7bb] text-[#6d716c]">Sign out <LogOut /></Button>
        </header>
        <div className="mt-8 space-y-6">
          {home.matters.map((matter) => <section key={matter.id} className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="border-b border-[#e8e3da] px-5 py-5 sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b765f]">{matter.matterNumber}</p><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-2xl font-semibold">{matter.name}</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Secure access</span></div></div><div className="space-y-4 p-5 sm:p-7">{matter.appointments.length ? matter.appointments.map((appointment) => <article key={appointment.id} className="rounded-xl border border-[#eadbd0] bg-white p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#b65f3a]">Appointment</p><h3 className="mt-1 text-base font-semibold text-[#39443f]">{appointment.title}</h3><p className="mt-2 text-sm text-[#626b64]">{formatDate(appointment.startsAt)} · {formatTime(appointment.startsAt, appointment.endsAt)}</p><p className="mt-1 text-xs text-[#8b8d88]">{appointment.location}</p></div><div className="flex size-10 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><CheckCircle2 className="size-5" /></div></div>{appointment.documents.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{appointment.documents.map((document) => <details key={document.id} className="group rounded-lg border border-[#eee5dc] bg-[#fffaf6] p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[#4d5851]"><FileText className="size-4 text-[#a24f31]" />{document.name}<span className="ml-auto text-xs text-[#a1a39d] group-open:rotate-180">⌄</span></summary><div className="mt-3 border-t border-[#eee5dc] pt-3"><p className="whitespace-pre-wrap text-xs leading-5 text-[#626b64]">{document.content}</p>{document.fields.length ? <div className="mt-4 space-y-2 border-t border-[#eee5dc] pt-3">{document.fields.map((field) => <div key={field.key} className="flex justify-between gap-3 text-xs"><span className="text-[#8b8d88]">{field.label}</span><span className="font-medium text-[#4d5851]">{field.value || "Not completed"}</span></div>)}</div> : null}</div></details>)}</div> : <p className="mt-5 rounded-lg bg-[#fffaf6] px-3 py-3 text-xs text-[#8b8d88]">Your team has not shared documents for this appointment yet.</p>}</article>) : <p className="rounded-lg bg-[#fffaf6] px-4 py-4 text-sm text-[#737872]">No upcoming appointment details are available yet.</p>}</div></section>)}
        </div>
        <p className="mt-7 text-center text-xs leading-5 text-[#9b765f]">MatterPilot shows only information your legal team has explicitly approved for client access.</p>
      </div>
    </main>
  )
}
