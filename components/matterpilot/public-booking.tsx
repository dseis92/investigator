"use client"

import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { useEffect, useState } from "react"

import {
  getPublicBookingSlotsAction,
  submitPublicBookingAction,
} from "@/app/matterpilot/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const appointmentTypes = [
  {
    name: "Initial consultation",
    detail: "Tell us what brings you in",
    duration: "45 minutes",
    icon: UserRound,
  },
  {
    name: "Existing client meeting",
    detail: "Discuss an active matter",
    duration: "60 minutes",
    icon: FileText,
  },
]

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function startOfBookingWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = start.getDay()
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
  return start
}

function bookingDays(anchor: Date) {
  const start = startOfBookingWeek(anchor)
  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

function nextBookingDate(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (next.getDay() === 0) next.setDate(next.getDate() + 1)
  if (next.getDay() === 6) next.setDate(next.getDate() + 2)
  return next
}

function formatSlot(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value))
}

export function PublicBookingPage({ slug }: { slug: string }) {
  const [step, setStep] = useState(0)
  const [type, setType] = useState(appointmentTypes[0].name)
  const [time, setTime] = useState("")
  const [selectedSlotIso, setSelectedSlotIso] = useState("")
  const [bookingWeek, setBookingWeek] = useState(() =>
    startOfBookingWeek(new Date())
  )
  const [selectedDate, setSelectedDate] = useState(() =>
    localDateKey(nextBookingDate(new Date()))
  )
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [availabilityError, setAvailabilityError] = useState("")
  const [availabilityErrorKey, setAvailabilityErrorKey] = useState("")
  const [loadedAvailabilityKey, setLoadedAvailabilityKey] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [summary, setSummary] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const availabilityKey = `${slug}:${type}:${localDateKey(startOfBookingWeek(bookingWeek))}`
  const availabilityLoading = step === 1 && loadedAvailabilityKey !== availabilityKey

  useEffect(() => {
    if (step !== 1) return
    let active = true
    void getPublicBookingSlotsAction({
      slug,
      appointmentTypeName: type,
      fromDate: localDateKey(startOfBookingWeek(bookingWeek)),
    }).then((result) => {
      if (!active) return
      setLoadedAvailabilityKey(availabilityKey)
      if (!result.ok) {
        setAvailableSlots([])
        setAvailabilityError(result.error)
        setAvailabilityErrorKey(availabilityKey)
        return
      }
      setAvailabilityErrorKey("")
      setAvailableSlots(result.slots)
    })
    return () => {
      active = false
    }
  }, [availabilityKey, bookingWeek, slug, step, type])

  const selectedDateSlots = loadedAvailabilityKey === availabilityKey ? availableSlots.filter((slot) => localDateKey(new Date(slot)) === selectedDate) : []

  function moveBookingWeek(amount: number) {
    const next = new Date(bookingWeek)
    next.setDate(next.getDate() + amount * 7)
    setBookingWeek(next)
    setSelectedDate(localDateKey(bookingDays(next)[0]))
    setTime("")
    setSelectedSlotIso("")
  }

  if (submitted) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#f4f1eb] p-5">
        <div className="w-full max-w-lg rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-8 text-center shadow-xl shadow-[#23313d]/5 sm:p-12">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="size-7" />
          </span>
          <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-[#b65f3a] uppercase">
            Request received
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-[#23313d]">
            Your time is on hold.
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#737872]">
            We’ll complete a quick conflict check and send confirmation to your
            email. You’ll also receive a secure link for the intake questions
            and documents we need.
          </p>
          <div className="mt-7 rounded-xl bg-[#f1eee8] p-4 text-left">
            <p className="text-xs font-bold tracking-[0.14em] text-[#8b8d88] uppercase">
              Requested appointment
            </p>
            <p className="mt-2 text-sm font-semibold text-[#23313d]">{type}</p>
            <p className="mt-1 text-xs text-[#737872]">
              {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(new Date(`${selectedDate}T12:00:00`))}{" "}
              · {time}
            </p>
          </div>
          <Link
            href="/matterpilot"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#b65f3a] hover:underline"
          >
            <ArrowLeft className="size-4" /> Back to MatterPilot
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[#f4f1eb] text-[#23313d]">
      <header className="flex h-20 items-center justify-between border-b border-[#ded9d0] bg-[#fbfaf7] px-5 sm:px-10">
        <Link href="/matterpilot" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#23313d] text-white">
            <CalendarDays className="size-4" />
          </span>
          <span>
            <span className="block font-serif text-lg font-semibold tracking-tight">
              MatterPilot
            </span>
            <span className="block text-[10px] font-medium tracking-[0.2em] text-[#8b8d88] uppercase">
              Harbor Legal
            </span>
          </span>
        </Link>
        <span className="hidden items-center gap-2 text-xs text-[#8b8d88] sm:flex">
          <ShieldCheck className="size-4 text-emerald-600" /> Secure client
          booking
        </span>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-5 py-10 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
        <div className="pt-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#b65f3a] uppercase">
            Start a conversation
          </p>
          <h1 className="mt-3 max-w-md font-serif text-4xl leading-tight font-semibold tracking-[-0.03em] text-[#23313d] sm:text-5xl">
            Let’s find the right time to talk.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#737872]">
            Choose a meeting type and a time that works for you. We’ll ask a few
            questions before confirming your appointment.
          </p>
          <div className="mt-8 space-y-3 text-xs text-[#6d756f]">
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#e7eee9] text-emerald-700">
                <ShieldCheck className="size-3.5" />
              </span>
              Your information stays private
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#f2e4d9] text-[#a65b3c]">
                <Clock3 className="size-3.5" />
              </span>
              Most consultations take 45 minutes
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#e6edf0] text-[#496779]">
                <FileText className="size-3.5" />
              </span>
              Secure document sharing after booking
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-xl shadow-[#23313d]/5 sm:p-7">
          <div className="mb-7 flex items-center gap-2">
            {["Meeting", "Time", "About you"].map((label, index) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-[10px] font-bold",
                    step >= index
                      ? "bg-[#b65f3a] text-white"
                      : "bg-[#e9e5de] text-[#8b8d88]"
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-semibold sm:block",
                    step >= index ? "text-[#4d5a53]" : "text-[#9b9d97]"
                  )}
                >
                  {label}
                </span>
                {index < 2 ? (
                  <span className="h-px flex-1 bg-[#e6e0d7]" />
                ) : null}
              </div>
            ))}
          </div>
          {step === 0 ? (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#23313d]">
                What would you like to schedule?
              </h2>
              <p className="mt-1 text-sm text-[#737872]">
                Choose the option that best fits your needs.
              </p>
              <div className="mt-5 space-y-3">
                {appointmentTypes.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      type="button"
                      key={item.name}
                      onClick={() => setType(item.name)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                        type === item.name
                          ? "border-[#b65f3a] bg-[#fff5ef] ring-1 ring-[#b65f3a]/15"
                          : "border-[#e2ddd4] bg-white hover:border-[#b7b1a7]"
                      )}
                    >
                      <span className="flex size-10 items-center justify-center rounded-lg bg-[#f1eee8] text-[#b65f3a]">
                        <Icon className="size-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">
                          {item.name}
                        </span>
                        <span className="mt-1 block text-xs text-[#868a85]">
                          {item.detail}
                        </span>
                      </span>
                      <span className="text-xs text-[#8b8d88]">
                        {item.duration}
                      </span>
                    </button>
                  )
                })}
              </div>
              <Button
                className="mt-6 w-full bg-[#23313d] hover:bg-[#18242e]"
                onClick={() => setStep(1)}
              >
                Choose a time <ArrowRight />
              </Button>
            </div>
          ) : step === 1 ? (
            <div>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="mb-4 flex items-center gap-1 text-xs font-semibold text-[#8b8d88] hover:text-[#23313d]"
              >
                <ChevronLeft className="size-3.5" /> Back
              </button>
              <h2 className="font-serif text-2xl font-semibold text-[#23313d]">
                Pick a time
              </h2>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm text-[#737872]">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(`${selectedDate}T12:00:00`))}{" "}
                  · Central Time
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveBookingWeek(-1)}
                    className="rounded-lg p-1.5 text-[#69736d] hover:bg-[#eeeae3]"
                    aria-label="Previous booking week"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBookingWeek(1)}
                    className="rounded-lg p-1.5 text-[#69736d] hover:bg-[#eeeae3]"
                    aria-label="Next booking week"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {bookingDays(bookingWeek).map((day) => {
                  const key = localDateKey(day)
                  const hasSlots = availableSlots.some(
                    (slot) => localDateKey(new Date(slot)) === key
                  )
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => {
                        setSelectedDate(key)
                        setTime("")
                        setSelectedSlotIso("")
                      }}
                      className={cn(
                        "rounded-xl border px-1 py-2 text-center transition-colors",
                        selectedDate === key
                          ? "border-[#b65f3a] bg-[#fff5ef] text-[#a24f30]"
                          : "border-[#e2ddd4] bg-white text-[#46534c] hover:border-[#b7b1a7]"
                      )}
                    >
                      <span className="block text-[10px] font-bold tracking-[0.1em] uppercase">
                        {new Intl.DateTimeFormat("en-US", {
                          weekday: "short",
                        }).format(day)}
                      </span>
                      <span className="mt-1 block text-base font-semibold">
                        {day.getDate()}
                      </span>
                      <span className="mt-0.5 block text-[9px]">
                        {hasSlots ? "Available" : "Full"}
                      </span>
                    </button>
                  )
                })}
              </div>
              {availabilityLoading ? (
                <div className="mt-5 rounded-xl border border-[#e2ddd4] bg-white p-4 text-center text-sm text-[#737872]">
                  Checking availability…
                </div>
              ) : availabilityErrorKey === availabilityKey && availabilityError ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-900">
                  {availabilityError}
                </div>
              ) : selectedDateSlots.length ? (
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedDateSlots.map((slot) => {
                  const label = formatSlot(slot)
                  return (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => {
                      setTime(label)
                      setSelectedSlotIso(slot)
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-sm font-semibold transition-colors",
                      selectedSlotIso === slot
                        ? "border-[#b65f3a] bg-[#fff5ef] text-[#a24f30]"
                        : "border-[#e2ddd4] bg-white text-[#46534c] hover:border-[#b7b1a7]"
                    )}
                  >
                    {label}
                  </button>
                  )
                })}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-[#ded9d0] bg-[#fbfaf7] p-4 text-center text-sm text-[#737872]">
                  No open times on this date. Choose another day.
                </div>
              )}
              <Button
                className="mt-6 w-full bg-[#23313d] hover:bg-[#18242e]"
                disabled={!selectedSlotIso || availabilityLoading}
                onClick={() => setStep(2)}
              >
                Continue <ArrowRight />
              </Button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mb-4 flex items-center gap-1 text-xs font-semibold text-[#8b8d88] hover:text-[#23313d]"
              >
                <ChevronLeft className="size-3.5" /> Back
              </button>
              <h2 className="font-serif text-2xl font-semibold text-[#23313d]">
                A little context helps.
              </h2>
              <p className="mt-1 text-sm text-[#737872]">
                We’ll use this to prepare your first conversation.
              </p>
              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">
                    Full name
                  </span>
                  <Input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">
                    Email address
                  </span>
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">
                    What can we help with?
                  </span>
                  <textarea
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    className="min-h-24 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a1a39d] focus:border-[#b65f3a]"
                    placeholder="A short description is enough for now."
                  />
                </label>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#f1eee8] p-3 text-xs leading-5 text-[#737872]">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                This is a tentative request. The firm will complete a conflict
                check before confirming your appointment.
              </div>
              {error ? (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {error}
                </p>
              ) : null}
              <Button
                className="mt-6 w-full bg-[#b65f3a] hover:bg-[#9f5030]"
                disabled={submitting || !fullName.trim() || !email.trim() || !selectedSlotIso}
                onClick={async () => {
                  setSubmitting(true)
                  setError("")
                  const result = await submitPublicBookingAction({
                    slug,
                    appointmentTypeName: type,
                    requestedStart: selectedSlotIso,
                    fullName,
                    email,
                    summary,
                  })
                  setSubmitting(false)
                  if (!result.ok) {
                    setError(result.error)
                    return
                  }
                  setSubmitted(true)
                }}
              >
                {submitting ? "Sending request…" : "Request appointment"}{" "}
                <Check />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
