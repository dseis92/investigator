"use client"

import { useEffect, useRef, useState, useActionState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock3, Download, FileText, KeyRound, LogOut, MessageSquareText, Send, ShieldCheck, Upload } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { createClientPortalDocumentDownloadUrlAction, sendClientPortalMessageAction, uploadClientPortalDocumentAction, type PortalDocumentUploadState } from "@/app/matterpilot/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
    messages: { id: string; senderRole: "client" | "firm"; senderEmail: string; body: string; createdAt: string }[]
    activity: { id: string; type: string; actorRole: "client" | "firm"; summary: string; createdAt: string }[]
    documentRequests: { id: string; appointmentId: string | null; title: string; description: string; status: "requested" | "uploaded" | "approved" | "rejected"; fileName: string | null; mimeType: string | null; sizeBytes: number | null; uploadedAt: string | null; reviewerNote: string | null; createdAt: string }[]
  }[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(value))
}

function formatTime(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
}

function ClientDocumentRequest({ request }: { request: ClientPortalHomeData["matters"][number]["documentRequests"][number] }) {
  const router = useRouter()
  const action = uploadClientPortalDocumentAction.bind(null, request.id)
  const [state, formAction, pending] = useActionState<PortalDocumentUploadState, FormData>(action, { error: null })
  const uploadedId = useRef<string | undefined>(undefined)
  const [downloadError, setDownloadError] = useState("")

  useEffect(() => {
    if (state.uploadedRequestId && state.uploadedRequestId !== uploadedId.current) {
      uploadedId.current = state.uploadedRequestId
      router.refresh()
    }
  }, [router, state.uploadedRequestId])

  async function download() {
    setDownloadError("")
    const result = await createClientPortalDocumentDownloadUrlAction(request.id)
    if (!result.ok) { setDownloadError(result.error); return }
    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  return <article className="rounded-lg border border-[#e4ded5] bg-white p-3"><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f2e2d8] text-[#a24f31]"><FileText className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#4d5751]">{request.title}</p><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", request.status === "approved" ? "bg-emerald-50 text-emerald-700" : request.status === "rejected" ? "bg-rose-50 text-rose-700" : request.status === "uploaded" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700")}>{request.status}</span></div>{request.description ? <p className="mt-1 text-xs leading-5 text-[#737872]">{request.description}</p> : null}{request.reviewerNote ? <p className="mt-2 text-[11px] text-[#a24f31]">Firm note: {request.reviewerNote}</p> : null}{request.fileName ? <p className="mt-2 truncate text-[11px] text-[#8b8d88]">{request.fileName}</p> : null}</div></div>{request.status === "requested" || request.status === "rejected" ? <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#eee5dc] pt-3"><input name="document" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,text/csv,.doc,.docx,.xls,.xlsx" required className="min-w-0 flex-1 text-[11px] text-[#737872] file:mr-2 file:rounded-md file:border-0 file:bg-[#f2e2d8] file:px-2 file:py-1.5 file:text-[11px] file:font-semibold file:text-[#8b604c]" /><Button type="submit" size="sm" disabled={pending} className="bg-[#385367] hover:bg-[#294351]">{pending ? "Uploading…" : "Upload document"}<Upload /></Button></form> : null}{request.status === "uploaded" || request.status === "approved" ? <div className="mt-3 flex items-center gap-2 border-t border-[#eee5dc] pt-3"><Button type="button" size="sm" variant="outline" onClick={() => void download()} className="border-[#c8d8dc] text-[#385367]"><Download />View uploaded file</Button><span className="text-[11px] text-[#8b8d88]">{request.status === "approved" ? "Accepted by your legal team" : "Awaiting review"}</span></div> : null}{state.error ? <p className="mt-2 text-xs font-medium text-rose-700" role="alert">{state.error}</p> : null}{downloadError ? <p className="mt-2 text-xs font-medium text-rose-700" role="alert">{downloadError}</p> : null}</article>
}

export function ClientPortalPage({ userEmail, home }: { userEmail: string | null; home: ClientPortalHomeData | null }) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState(userEmail ?? "")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({})
  const [sendingMatter, setSendingMatter] = useState("")

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

  async function sendMessage(matterId: string) {
    const body = messageDrafts[matterId]?.trim() ?? ""
    if (!body) return
    setSendingMatter(matterId)
    setError("")
    const result = await sendClientPortalMessageAction({ matterId, body })
    setSendingMatter("")
    if (!result.ok) { setError(result.error); return }
    setMessageDrafts((current) => ({ ...current, [matterId]: "" }))
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
          {home.matters.map((matter) => <section key={matter.id} className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="border-b border-[#e8e3da] px-5 py-5 sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b765f]">{matter.matterNumber}</p><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-2xl font-semibold">{matter.name}</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Secure access</span></div></div><div className="space-y-4 p-5 sm:p-7">{matter.appointments.length ? matter.appointments.map((appointment) => <article key={appointment.id} className="rounded-xl border border-[#eadbd0] bg-white p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#b65f3a]">Appointment</p><h3 className="mt-1 text-base font-semibold text-[#39443f]">{appointment.title}</h3><p className="mt-2 text-sm text-[#626b64]">{formatDate(appointment.startsAt)} · {formatTime(appointment.startsAt, appointment.endsAt)}</p><p className="mt-1 text-xs text-[#8b8d88]">{appointment.location}</p></div><div className="flex size-10 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><CheckCircle2 className="size-5" /></div></div>{appointment.documents.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{appointment.documents.map((document) => <details key={document.id} className="group rounded-lg border border-[#eee5dc] bg-[#fffaf6] p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[#4d5851]"><FileText className="size-4 text-[#a24f31]" />{document.name}<span className="ml-auto text-xs text-[#a1a39d] group-open:rotate-180">⌄</span></summary><div className="mt-3 border-t border-[#eee5dc] pt-3"><p className="whitespace-pre-wrap text-xs leading-5 text-[#626b64]">{document.content}</p>{document.fields.length ? <div className="mt-4 space-y-2 border-t border-[#eee5dc] pt-3">{document.fields.map((field) => <div key={field.key} className="flex justify-between gap-3 text-xs"><span className="text-[#8b8d88]">{field.label}</span><span className="font-medium text-[#4d5851]">{field.value || "Not completed"}</span></div>)}</div> : null}</div></details>)}</div> : <p className="mt-5 rounded-lg bg-[#fffaf6] px-3 py-3 text-xs text-[#8b8d88]">Your team has not shared documents for this appointment yet.</p>}</article>) : <p className="rounded-lg bg-[#fffaf6] px-4 py-4 text-sm text-[#737872]">No upcoming appointment details are available yet.</p>}<section className="rounded-xl border border-[#d8e1e4] bg-[#f7fbfc] p-4"><div className="flex items-center gap-2"><MessageSquareText className="size-4 text-[#385367]" /><h3 className="text-sm font-semibold text-[#385367]">Message your legal team</h3></div>{matter.messages.length ? <div className="mt-3 space-y-2">{matter.messages.slice(-4).map((message) => <div key={message.id} className={cn("rounded-lg px-3 py-2.5 text-xs leading-5", message.senderRole === "client" ? "ml-6 bg-[#e8eef0] text-[#385367]" : "mr-6 bg-white text-[#4d5751]")}><p>{message.body}</p><p className="mt-1 text-[10px] opacity-60">{message.senderRole === "client" ? "You" : "Your legal team"} · {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</p></div>)}</div> : <p className="mt-3 text-xs text-[#63747a]">No messages yet. Send a question or update when you need help.</p>}<div className="mt-3 flex gap-2"><textarea value={messageDrafts[matter.id] ?? ""} onChange={(event) => setMessageDrafts((current) => ({ ...current, [matter.id]: event.target.value }))} placeholder="Write a message…" className="min-h-11 flex-1 rounded-lg border border-[#c8d8dc] bg-white px-3 py-2 text-xs text-[#39443f] outline-none focus:border-[#385367]" /><Button size="sm" onClick={() => void sendMessage(matter.id)} disabled={sendingMatter === matter.id || !(messageDrafts[matter.id] ?? "").trim()} className="self-end bg-[#385367] hover:bg-[#294351]">{sendingMatter === matter.id ? "Sending…" : "Send"}<Send /></Button></div></section>{matter.activity.length ? <details className="rounded-xl border border-[#e4ded5] bg-white p-4"><summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#4d5751]"><Clock3 className="size-4 text-[#a24f31]" />Recent portal activity</summary><div className="mt-3 space-y-2 border-t border-[#eee5dc] pt-3">{matter.activity.slice(0, 8).map((activity) => <p key={activity.id} className="text-xs text-[#737872]">{activity.summary} · {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(activity.createdAt))}</p>)}</div></details> : null}</div></section>)}
        </div>
        {home.matters.some((matter) => matter.documentRequests.length > 0) ? <section className="mt-6 rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-7"><div className="flex items-center gap-2"><Upload className="size-4 text-[#a24f31]" /><h2 className="font-serif text-xl font-semibold">Documents requested by your legal team</h2></div><p className="mt-1 text-xs text-[#737872]">Upload requested files securely. Your legal team will review each upload before treating it as accepted.</p><div className="mt-4 space-y-3">{home.matters.flatMap((matter) => matter.documentRequests.map((request) => <ClientDocumentRequest key={request.id} request={request} />))}</div></section> : null}
        <p className="mt-7 text-center text-xs leading-5 text-[#9b765f]">MatterPilot shows only information your legal team has explicitly approved for client access.</p>
      </div>
    </main>
  )
}
