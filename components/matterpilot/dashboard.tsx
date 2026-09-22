"use client"

import Link from "next/link"
import {
  AlarmClock,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Command,
  ContactRound,
  FileText,
  History,
  LockKeyhole,
  Gavel,
  LayoutDashboard,
  Link2,
  List,
  Mail,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { SignOutButton } from "@/components/sign-out-button"
import {
  createAppointmentDocumentDraftAction,
  createAppointmentAction,
  createAppointmentPacketAction,
  enableClientPortalAccessAction,
  createMatterDeadlineAction,
  createMatterContactAction,
  queueAppointmentEmailAction,
  revokeAppointmentPacketAction,
  revokeClientPortalAccessAction,
  saveAppointmentEmailDraftAction,
  saveAppointmentDocumentDraftAction,
  restoreAppointmentDocumentDraftVersionAction,
  updateAppointmentDocumentDraftStatusAction,
  updateAppointmentDocumentDraftVisibilityAction,
  updateAppointmentConflictAction,
  updateAppointmentDocumentAction,
  updateAppointmentCommunicationAction,
  updateMatterDeadlineStatusAction,
  updateMatterContactStatusAction,
  updateAppointmentParticipantAction,
  updateAppointmentTaskAction,
} from "@/app/matterpilot/actions"
import { AppointmentComposer } from "@/components/matterpilot/appointment-composer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type Matter = {
  id: string
  name: string
  matter_number: string
  case_mode: string
  status: string
}

type Readiness = "ready" | "at_risk" | "blocked"

export type Appointment = {
  id: string
  title: string
  client: string
  clientEmail?: string | null
  matter: string
  matterId: string
  type: string
  workflowKey?: string
  notes?: string | null
  isNote?: boolean
  conflictStatus?: "pending" | "clear" | "issue"
  day: number
  start: number
  end: number
  date?: string
  startAt?: string
  endAt?: string
  readiness: Readiness
  participants: number
  location: string
  owner: string
  checklist: { id?: string; label: string; done: boolean; status?: "open" | "done" | "waived"; isBlocking?: boolean }[]
  documents: { id?: string; label: string; status: "ready" | "requested" | "missing"; sourceStatus?: "requested" | "received" | "signed" | "waived"; isRequired?: boolean; draftId?: string; draftContent?: string; draftStatus?: "draft" | "final"; draftVisibility?: "internal" | "client"; signatureStatus?: "requested" | "signed" | "declined" | "cancelled"; versions?: { id: string; versionNumber: number; content: string; status: "draft" | "final"; visibility: "internal" | "client"; createdAt: string }[]; templateKey?: string | null }[]
  participantDetails?: { id: string; displayName: string; responseStatus: "pending" | "confirmed" | "declined"; isRequired: boolean }[]
  packet?: { id: string; status: "active" | "completed" | "revoked" | "expired"; expiresAt: string; viewedAt: string | null; completedAt: string | null; reminders: { id: string; kind: "first_reminder" | "final_reminder"; sendAt: string; status: "planned" | "sent" | "cancelled" }[] }
  portalAccess?: { id: string; status: "active" | "revoked"; lastAccessedAt: string | null; revokedAt: string | null }
  communications?: { id: string; channel: "email" | "sms"; direction: "outbound" | "inbound"; status: "draft" | "queued" | "sent" | "failed" | "cancelled"; recipient: string | null; subject: string | null; body: string; createdAt: string; sentAt: string | null }[]
}

export type DashboardCommunication = {
  id: string
  matterId: string
  appointmentId: string
  matter: string
  appointment: string
  client: string
  channel: "email" | "sms"
  direction: "outbound" | "inbound"
  status: "draft" | "queued" | "sent" | "failed" | "cancelled"
  recipient: string | null
  subject: string | null
  body: string
  createdAt: string
  sentAt: string | null
}

export type DashboardDeadline = {
  id: string
  matterId: string
  matter: string
  title: string
  kind: "court_date" | "filing" | "discovery" | "client" | "internal" | "other"
  dueAt: string
  priority: "normal" | "high" | "critical"
  status: "open" | "at_risk" | "missed" | "completed" | "waived"
  notes: string | null
  assignedTo: string | null
}

export type DashboardContact = {
  id: string
  matterId: string
  matter: string
  name: string
  role: "client" | "prospective_client" | "witness" | "expert" | "opposing_counsel" | "other"
  email: string | null
  phone: string | null
  notes: string | null
  status: "active" | "archived"
  appointmentCount: number
  openDeadlineCount: number
}

const WEEK = [
  { label: "Mon", date: "21", full: "Mon, Sep 21", iso: "2026-09-21" },
  { label: "Tue", date: "22", full: "Tue, Sep 22", iso: "2026-09-22" },
  { label: "Wed", date: "23", full: "Wed, Sep 23", iso: "2026-09-23" },
  { label: "Thu", date: "24", full: "Thu, Sep 24", iso: "2026-09-24" },
  { label: "Fri", date: "25", full: "Fri, Sep 25", iso: "2026-09-25" },
]

const TIMES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

const STATUS = {
  ready: {
    label: "Ready",
    icon: CheckCircle2,
    accent: "border-emerald-500/30 bg-emerald-50 text-emerald-900",
    dot: "bg-emerald-500",
  },
  at_risk: {
    label: "At risk",
    icon: AlarmClock,
    accent: "border-amber-500/40 bg-amber-50 text-amber-950",
    dot: "bg-amber-500",
  },
  blocked: {
    label: "Blocked",
    icon: ShieldCheck,
    accent: "border-rose-500/35 bg-rose-50 text-rose-950",
    dot: "bg-rose-500",
  },
} satisfies Record<Readiness, { label: string; icon: typeof CheckCircle2; accent: string; dot: string }>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seededAppointments(matter: Matter | undefined): Appointment[] {
  const matterName = matter?.name ?? "Harlow v. Green"
  const matterId = matter?.id ?? "demo-matter"
  return [
    {
      id: "apt-1",
      title: "Deposition preparation",
      client: "Dana Ruiz",
      matter: matterName,
      matterId,
      type: "Witness preparation",
      day: 0,
      start: 9,
      end: 10.5,
      readiness: "ready",
      participants: 3,
      location: "Conference room 2",
      owner: "Maya Chen",
      checklist: [
        { label: "Conflict check complete", done: true },
        { label: "Witness statement reviewed", done: true },
        { label: "Prep outline assigned", done: true },
        { label: "Client confirmation received", done: true },
      ],
      documents: [
        { label: "Deposition notice", status: "ready" },
        { label: "Witness packet", status: "ready" },
        { label: "Photo ID", status: "requested" },
      ],
    },
    {
      id: "apt-2",
      title: "Initial consultation",
      client: "Marcus Whitfield",
      matter: "New inquiry · intake",
      matterId: "intake",
      type: "New client consultation",
      day: 0,
      start: 13,
      end: 14,
      readiness: "at_risk",
      participants: 2,
      location: "Video call · Zoom",
      owner: "Maya Chen",
      checklist: [
        { label: "Conflict check complete", done: true },
        { label: "Intake form completed", done: false },
        { label: "Documents requested", done: false },
      ],
      documents: [
        { label: "Intake questionnaire", status: "ready" },
        { label: "Police report", status: "missing" },
        { label: "Engagement letter", status: "requested" },
      ],
    },
    {
      id: "apt-3",
      title: "Mediation conference",
      client: "Northstar LLC",
      matter: matterName,
      matterId,
      type: "Mediation",
      day: 1,
      start: 11,
      end: 13,
      readiness: "blocked",
      participants: 6,
      location: "Carter ADR · Room 4",
      owner: "Elliot James",
      checklist: [
        { label: "Conflict check complete", done: true },
        { label: "Mediation statement approved", done: false },
        { label: "Authority confirmed", done: false },
        { label: "All parties confirmed", done: false },
      ],
      documents: [
        { label: "Mediation statement", status: "missing" },
        { label: "Damages summary", status: "ready" },
        { label: "Settlement authority", status: "requested" },
      ],
    },
    {
      id: "apt-4",
      title: "Expert review",
      client: "Dr. Priya Abbas",
      matter: matterName,
      matterId,
      type: "Expert meeting",
      day: 2,
      start: 10,
      end: 11.5,
      readiness: "ready",
      participants: 3,
      location: "Video call · Teams",
      owner: "Maya Chen",
      checklist: [
        { label: "Conflict check complete", done: true },
        { label: "Materials shared", done: true },
        { label: "Questions assigned", done: true },
      ],
      documents: [
        { label: "Expert packet", status: "ready" },
        { label: "Prior opinions", status: "ready" },
      ],
    },
    {
      id: "apt-5",
      title: "Status hearing",
      client: "State v. Whitfield",
      matter: matterName,
      matterId,
      type: "Court appearance",
      day: 3,
      start: 14,
      end: 15,
      readiness: "at_risk",
      participants: 2,
      location: "County courthouse · 4B",
      owner: "Maya Chen",
      checklist: [
        { label: "Court notice saved", done: true },
        { label: "Client reminder sent", done: true },
        { label: "Hearing prep complete", done: false },
      ],
      documents: [
        { label: "Court notice", status: "ready" },
        { label: "Hearing outline", status: "requested" },
      ],
    },
    {
      id: "apt-6",
      title: "Client prep call",
      client: "Jordan Lee",
      matter: matterName,
      matterId,
      type: "Client meeting",
      day: 4,
      start: 15,
      end: 16,
      readiness: "ready",
      participants: 2,
      location: "Video call · Zoom",
      owner: "Elliot James",
      checklist: [
        { label: "Conflict check complete", done: true },
        { label: "Agenda shared", done: true },
        { label: "Client confirmation received", done: true },
      ],
      documents: [{ label: "Preparation agenda", status: "ready" }],
    },
  ]
}

function StatusPill({ status }: { status: Readiness }) {
  const config = STATUS[status]
  const Icon = config.icon
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold", config.accent)}>
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}

function MiniAvatar({ label, tone = "navy" }: { label: string; tone?: "navy" | "copper" | "sage" | "sand" }) {
  const tones = {
    navy: "bg-[#1c2b3a] text-white",
    copper: "bg-[#b65f3a] text-white",
    sage: "bg-[#7d9480] text-white",
    sand: "bg-[#e8d6bd] text-[#5b4434]",
  }
  return <span className={cn("inline-flex size-7 items-center justify-center rounded-full text-[10px] font-bold", tones[tone])}>{label}</span>
}

function AppointmentCard({ appointment, onSelect }: { appointment: Appointment; onSelect: () => void }) {
  const config = STATUS[appointment.readiness]
  const startDate = appointment.startAt ? new Date(appointment.startAt) : undefined
  const endDate = appointment.endAt ? new Date(appointment.endAt) : undefined
  const startHour = startDate ? startDate.getHours() + startDate.getMinutes() / 60 : appointment.start
  const endHour = endDate ? endDate.getHours() + endDate.getMinutes() / 60 : appointment.end
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group absolute inset-x-1 overflow-hidden rounded-lg border p-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#b65f3a]/50",
        config.accent
      )}
      style={{ top: `${(startHour - 8) * 76 + 4}px`, height: `${Math.max((endHour - startHour) * 76 - 8, 58)}px` }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-[11px] font-bold tracking-[-0.01em]">{appointment.title}</span>
        <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", config.dot)} />
      </div>
      <p className="mt-1 truncate text-[11px] opacity-75">{appointment.client}</p>
      <div className="mt-2 flex items-center gap-1 text-[10px] opacity-65">
        <Clock3 className="size-3" />
        {formatTime(startHour)}
        <span>·</span>
        <UsersRound className="size-3" />
        {appointment.participants}
      </div>
    </button>
  )
}

function formatTime(hour: number) {
  const wholeHour = Math.floor(hour)
  const minutes = Math.round((hour - wholeHour) * 60)
  const suffix = wholeHour >= 12 ? "PM" : "AM"
  const normalized = wholeHour > 12 ? wholeHour - 12 : wholeHour
  return `${normalized}:${String(minutes).padStart(2, "0")} ${suffix}`
}

function appointmentStartDate(appointment: Appointment) {
  return appointment.startAt ? new Date(appointment.startAt) : null
}

function appointmentDayLabel(appointment: Appointment) {
  const date = appointmentStartDate(appointment)
  return date ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(date) : WEEK[appointment.day]?.full ?? "Scheduled date"
}

function appointmentTimeRange(appointment: Appointment) {
  const start = appointmentStartDate(appointment)
  const end = appointment.endAt ? new Date(appointment.endAt) : null
  return `${start ? formatTime(start.getHours() + start.getMinutes() / 60) : formatTime(appointment.start)} – ${end ? formatTime(end.getHours() + end.getMinutes() / 60) : formatTime(appointment.end)}`
}

function ReadinessCard({ appointment, onSelect }: { appointment: Appointment; onSelect: () => void }) {
  const config = STATUS[appointment.readiness]
  const Icon = config.icon
  const nextTask = appointment.checklist.find((item) => !item.done)?.label
  return (
    <button type="button" onClick={onSelect} className="group flex w-full items-start gap-3 border-b border-[#e8e3da] px-5 py-4 text-left last:border-0 hover:bg-[#faf8f4]">
      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", config.accent)}>
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[#23313d]">{appointment.title}</span>
          <span className="shrink-0 text-[11px] font-medium text-[#8b8d88]">{appointmentDayLabel(appointment).split(",")[0]}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-[#7d817c]">{appointment.client} · {appointment.matter}</span>
        <span className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8b8d88]">
          {nextTask ? <><span className={cn("size-1.5 rounded-full", config.dot)} /> Next: {nextTask}</> : <><Check className="size-3 text-emerald-600" /> All prep complete</>}
        </span>
      </span>
    </button>
  )
}

type AppointmentSlot = { date: string; time: string }

type CalendarFilter = "all" | Readiness | "notes"

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function startOfWorkWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = start.getDay()
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))
  return start
}

function workWeekDays(anchor: Date) {
  const start = startOfWorkWeek(anchor)
  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

function calendarEventDate(appointment: Appointment) {
  return appointment.startAt ? new Date(appointment.startAt) : null
}

function calendarEventHour(appointment: Appointment) {
  const start = calendarEventDate(appointment)
  return start ? start.getHours() + start.getMinutes() / 60 : appointment.start
}

function calendarEventEndHour(appointment: Appointment) {
  const end = appointment.endAt ? new Date(appointment.endAt) : null
  return end ? end.getHours() + end.getMinutes() / 60 : appointment.end
}

function CalendarBoard({ appointments, onSelect, onCreate }: { appointments: Appointment[]; onSelect: (appointment: Appointment) => void; onCreate: (slot?: AppointmentSlot) => void }) {
  const firstDatedAppointment = appointments.find((appointment) => appointment.startAt)?.startAt
  const [anchor, setAnchor] = useState(() => startOfWorkWeek(firstDatedAppointment ? new Date(firstDatedAppointment) : new Date()))
  const [view, setView] = useState<"week" | "agenda">("week")
  const [filter, setFilter] = useState<CalendarFilter>("all")
  const days = workWeekDays(anchor)
  const dayKeys = new Set(days.map(localDateKey))
  const weekAppointments = appointments.filter((appointment) => {
    const date = calendarEventDate(appointment)
    if (!date || !dayKeys.has(localDateKey(date))) return false
    if (filter === "notes") return Boolean(appointment.isNote)
    if (filter !== "all") return appointment.readiness === filter && !appointment.isNote
    return true
  })
  const conflicts = weekAppointments.reduce((count, appointment, index) => {
    const date = calendarEventDate(appointment)
    if (!date) return count
    const start = appointment.startAt ? new Date(appointment.startAt).getTime() : 0
    const overlaps = weekAppointments.some((other, otherIndex) => {
      if (index === otherIndex || !other.startAt || !other.endAt || !appointment.endAt) return false
      const otherDate = calendarEventDate(other)
      if (!otherDate || localDateKey(otherDate) !== localDateKey(date)) return false
      return start < new Date(other.endAt).getTime() && new Date(appointment.endAt).getTime() > new Date(other.startAt).getTime()
    })
    return count + (overlaps ? 1 : 0)
  }, 0) / 2
  const weekLabel = `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(days[0])} – ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(days[4])}`

  function moveWeek(amount: number) {
    const next = new Date(anchor)
    next.setDate(next.getDate() + amount * 7)
    setAnchor(next)
  }

  return (
    <div id="calendar" className="min-w-0 rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#e8e3da] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex items-center gap-2"><h2 className="font-serif text-xl font-semibold text-[#23313d]">Calendar</h2><span className="rounded-full bg-[#eeeae3] px-2 py-0.5 text-[10px] font-bold text-[#777b76]">Work week</span></div><p className="mt-1 text-xs text-[#8b8d88]">{weekLabel} · Click any open time to schedule an appointment or note.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-[#ded9d0] bg-white p-1" role="group" aria-label="Calendar view"><button type="button" onClick={() => setView("week")} className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold", view === "week" ? "bg-[#23313d] text-white" : "text-[#7b817b] hover:bg-[#f1eee8]")}><CalendarDays className="size-3.5" />Week</button><button type="button" onClick={() => setView("agenda")} className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold", view === "agenda" ? "bg-[#23313d] text-white" : "text-[#7b817b] hover:bg-[#f1eee8]")}><List className="size-3.5" />Agenda</button></div>
            <button type="button" onClick={() => { setAnchor(startOfWorkWeek(new Date())) }} className="rounded-lg border border-[#ded9d0] bg-white px-2.5 py-2 text-[11px] font-semibold text-[#59645e] hover:border-[#c08a6d]">Today</button>
            <button type="button" onClick={() => moveWeek(-1)} className="rounded-lg p-2 text-[#69736d] hover:bg-[#eeeae3]" aria-label="Previous work week"><ChevronLeft className="size-4" /></button>
            <button type="button" onClick={() => moveWeek(1)} className="rounded-lg p-2 text-[#69736d] hover:bg-[#eeeae3]" aria-label="Next work week"><ChevronRight className="size-4" /></button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Calendar filters"><span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b9d97]">Show</span>{(["all", "ready", "at_risk", "blocked", "notes"] as CalendarFilter[]).map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors", filter === option ? "border-[#b65f3a] bg-[#fff5ef] text-[#a24f31]" : "border-[#e1dbd1] bg-white text-[#7b817b] hover:border-[#c08a6d]")}>{option === "all" ? "Everything" : option === "at_risk" ? "At risk" : option === "notes" ? "Notes" : option[0].toUpperCase() + option.slice(1)}</button>)}</div>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-[#8b8d88]"><span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" />{Math.max(days.length * 10 - weekAppointments.length, 0)} open windows</span><span className={cn("inline-flex items-center gap-1.5", conflicts ? "text-rose-700" : "text-[#8b8d88]")}><AlertTriangle className="size-3.5" />{conflicts ? `${conflicts} overlap${conflicts === 1 ? "" : "s"}` : "No overlaps"}</span></div>
        </div>
      </div>

      {view === "week" ? <div className="overflow-x-auto"><div className="min-w-[780px]"><div className="grid grid-cols-[58px_repeat(5,minmax(140px,1fr))] border-b border-[#e8e3da]"><div />{days.map((day) => <button key={localDateKey(day)} type="button" onClick={() => onCreate({ date: localDateKey(day), time: "09:00" })} className="px-2 py-3 text-center transition-colors hover:bg-[#fff5ef]"><span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b8d88]">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}</span><span className={cn("mt-1 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold", localDateKey(day) === localDateKey(new Date()) ? "bg-[#b65f3a] text-white" : "text-[#23313d]")}>{day.getDate()}</span></button>)}</div><div className="grid grid-cols-[58px_repeat(5,minmax(140px,1fr))]"><div className="relative">{TIMES.map((time) => <div key={time} className="h-[76px] border-b border-[#eeeae3] pr-2 pt-1 text-right text-[10px] text-[#a1a39d]">{time > 12 ? time - 12 : time}{time >= 12 ? "p" : "a"}</div>)}</div>{days.map((day) => { const dateKey = localDateKey(day); const dayAppointments = weekAppointments.filter((appointment) => calendarEventDate(appointment) && localDateKey(calendarEventDate(appointment)!) === dateKey); return <div key={dateKey} className="relative border-l border-[#eeeae3]">{TIMES.map((time) => <div key={time} className="relative h-[76px] border-b border-[#eeeae3]"><button type="button" aria-label={`Create appointment on ${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(day)} at ${formatTime(time)}`} onClick={() => onCreate({ date: dateKey, time: `${String(time).padStart(2, "0")}:00` })} className="absolute inset-0 z-0 rounded-sm transition-colors hover:bg-[#fff5ef] focus-visible:bg-[#fff5ef]" /></div>)}{dayAppointments.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onSelect={() => onSelect(appointment)} />)}</div> })}</div></div></div> : <div className="divide-y divide-[#e8e3da] px-5 sm:px-6">{days.map((day) => { const dateKey = localDateKey(day); const dayAppointments = weekAppointments.filter((appointment) => calendarEventDate(appointment) && localDateKey(calendarEventDate(appointment)!) === dateKey).sort((a, b) => calendarEventHour(a) - calendarEventHour(b)); return <div key={dateKey} className="py-4"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b765f]">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(day)}</p><button type="button" onClick={() => onCreate({ date: dateKey, time: "09:00" })} className="text-[11px] font-semibold text-[#b65f3a] hover:underline"><Plus className="mr-1 inline size-3" />Add</button></div>{dayAppointments.length ? <div className="space-y-2">{dayAppointments.map((appointment) => { const config = STATUS[appointment.readiness]; const Icon = appointment.isNote ? CalendarClock : config.icon; return <button key={appointment.id} type="button" onClick={() => onSelect(appointment)} className="flex w-full items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-3 text-left transition-colors hover:border-[#c08a6d] hover:bg-[#fffaf6]"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", appointment.isNote ? "bg-[#e8eef0] text-[#385367]" : config.accent)}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-[#39443f]">{appointment.title}</span><span className="rounded-full bg-[#f1eee8] px-2 py-0.5 text-[10px] font-semibold text-[#737872]">{appointment.isNote ? "Note" : config.label}</span></span><span className="mt-1 block truncate text-xs text-[#8b8d88]">{formatTime(calendarEventHour(appointment))} – {formatTime(calendarEventEndHour(appointment))} · {appointment.client} · {appointment.matter}</span></span><ArrowUpRight className="size-4 shrink-0 text-[#a6a9a2]" /></button> })}</div> : <button type="button" onClick={() => onCreate({ date: dateKey, time: "09:00" })} className="w-full rounded-xl border border-dashed border-[#d8d1c6] bg-[#faf8f4] px-4 py-4 text-left text-xs text-[#8b8d88] hover:border-[#c08a6d] hover:text-[#b65f3a]">No appointments scheduled. Add a note or appointment.</button>}</div> })}</div>}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NewAppointmentPanel({ matters, onClose, initialSlot }: { matters: Matter[]; onClose: () => void; initialSlot?: AppointmentSlot }) {
  const [step, setStep] = useState<"type" | "details" | "done">(initialSlot ? "details" : "type")
  const [selected, setSelected] = useState("Initial consultation")
  const [title, setTitle] = useState("Initial consultation")
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "")
  const [date, setDate] = useState(initialSlot?.date ?? "2026-09-22")
  const [time, setTime] = useState(initialSlot?.time ?? "13:00")
  const [location, setLocation] = useState("Video call · Zoom")
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const types = [
    ["Initial consultation", "45 min", "New client"],
    ["Client meeting", "60 min", "Existing matter"],
    ["Deposition preparation", "90 min", "Litigation"],
    ["Mediation", "2 hr", "Settlement"],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-[#15212c]/30 backdrop-blur-[2px] sm:p-4">
      <div className="flex h-full w-full max-w-md flex-col bg-[#fbfaf7] shadow-2xl sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#e8e3da] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b65f3a]">New appointment</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-[#23313d]">Put the matter in motion</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button>
        </div>

        {step === "type" ? (
          <div className="flex-1 overflow-auto p-5">
            <p className="mb-4 text-sm text-[#737872]">Start with a workflow template. MatterPilot will create the prep checklist, reminders, and client requests around it.</p>
            <div className="space-y-2">
              {types.map(([name, duration, tag]) => (
                <button key={name} type="button" onClick={() => setSelected(name)} className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors", selected === name ? "border-[#b65f3a] bg-[#fff5ef] ring-1 ring-[#b65f3a]/20" : "border-[#e2ddd4] bg-white hover:border-[#b7b1a7]")}>
                  <span><span className="block text-sm font-semibold text-[#23313d]">{name}</span><span className="mt-0.5 block text-xs text-[#868a85]">{tag}</span></span>
                  <span className="text-xs font-medium text-[#868a85]">{duration}</span>
                </button>
              ))}
            </div>
            <Button className="mt-6 w-full bg-[#23313d] hover:bg-[#18242e]" onClick={() => setStep("details")}>Continue <ArrowUpRight /></Button>
          </div>
        ) : step === "details" ? (
          <div className="flex-1 overflow-auto p-5">
            <div className="mb-5 rounded-xl bg-[#f1eee8] p-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b8d88]">Workflow</p><p className="mt-1 text-sm font-semibold text-[#23313d]">{selected}</p></div>
            <div className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Appointment title</span><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deposition preparation" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Matter</span><select value={matterId} onChange={(event) => setMatterId(event.target.value)} className="h-10 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 text-sm text-[#23313d] outline-none focus:border-[#b65f3a]"><option value="">Select a matter</option>{matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.name}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Client or lead</span><Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Search people or organizations" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Date</span><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Time</span><Input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Location</span><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Video call, room, or courthouse" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Client email <span className="font-normal text-[#9b9d97]">(optional)</span></span><Input type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="client@example.com" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Notes <span className="font-normal text-[#9b9d97]">(optional)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 w-full rounded-lg border border-[#ddd8d0] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a1a39d] focus:border-[#b65f3a]" placeholder="Agenda, preparation notes, or internal context" /></label>
              <div className="rounded-xl border border-[#e4ded5] bg-white p-3"><div className="flex items-center gap-2 text-xs font-semibold text-[#5e655f]"><ShieldCheck className="size-4 text-emerald-600" /> Conflict check required before confirmation</div><p className="mt-1 pl-6 text-xs leading-5 text-[#868a85]">The client receives a tentative hold while the firm completes its review.</p></div>
              {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setStep("type")}>Back</Button><Button className="bg-[#23313d] hover:bg-[#18242e]" disabled={saving || !matterId || !title.trim()} onClick={async () => { setSaving(true); setError(""); const startsAt = new Date(`${date}T${time}:00`).toISOString(); const endsAt = new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString(); const result = await createAppointmentAction({ matterId, title, typeName: selected, workflowKey: "custom", startsAt, endsAt, location, notes, clientName, clientEmail }); setSaving(false); if (!result.ok) { setError(result.error); return } setStep("done") }}>{saving ? "Creating…" : "Create hold"} <Plus /></Button></div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-7" /></span><h2 className="mt-5 font-serif text-2xl font-semibold text-[#23313d]">Tentative hold created</h2><p className="mt-2 max-w-xs text-sm leading-6 text-[#737872]">The intake workflow is ready. Complete the conflict check to confirm the appointment and send the client their preparation link.</p><Button className="mt-6 bg-[#23313d] hover:bg-[#18242e]" onClick={onClose}>Back to calendar</Button></div>
        )}
      </div>
    </div>
  )
}

function DocumentDraftEditor({
  documentName,
  content,
  status,
  visibility,
  versions,
  saving,
  onChange,
  onClose,
  onApprove,
  onReopen,
  onSave,
  onToggleVisibility,
  onRestoreVersion,
}: {
  documentName: string
  content: string
  status: "draft" | "final"
  visibility: "internal" | "client"
  versions: { id: string; versionNumber: number; content: string; status: "draft" | "final"; visibility: "internal" | "client"; createdAt: string }[]
  saving: boolean
  onChange: (content: string) => void
  onClose: () => void
  onApprove: () => void
  onReopen: () => void
  onSave: () => void
  onToggleVisibility: () => void
  onRestoreVersion: (versionId: string) => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#15212c]/35 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#fbfaf7] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#e8e3da] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b65f3a]">Ready-made draft</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-[#23313d]">{documentName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2"><span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", status === "final" ? "bg-emerald-50 text-emerald-700" : "bg-[#f1eee8] text-[#737872]")}>{status === "final" ? "Final" : "Draft"}</span><span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", visibility === "client" ? "bg-[#f2e2d8] text-[#a24f31]" : "bg-slate-100 text-slate-600")}>{visibility === "client" ? "Client-visible" : "Internal only"}</span><span className="text-[10px] text-[#9b9d97]">{versions.length} version{versions.length === 1 ? "" : "s"}</span></div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close draft editor"><X /></Button>
        </div>
        <div className="flex-1 overflow-auto p-5 sm:p-6">
          <textarea
            value={content}
            onChange={(event) => onChange(event.target.value)}
            disabled={status === "final"}
            aria-label={`${documentName} draft content`}
            className="min-h-[28rem] w-full resize-y rounded-xl border border-[#dcd6cc] bg-white px-4 py-4 font-mono text-xs leading-6 text-[#39443f] outline-none transition-colors focus:border-[#b65f3a] focus:ring-2 focus:ring-[#b65f3a]/10 disabled:bg-[#f1eee8] disabled:text-[#737872]"
          />
          <div className="mt-3 flex gap-2 rounded-xl border border-[#e4ded5] bg-[#f8f5ef] p-3 text-xs leading-5 text-[#737872]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#b65f3a]" />
            <span>{visibility === "client" ? "This final version is eligible for the secure client packet. MatterPilot will not send or file it automatically." : "This document is internal-only. It will stay out of client packets until an attorney marks a final version client-visible."}</span>
          </div>
          {versions.length > 0 ? <div className="mt-4 rounded-xl border border-[#e4ded5] bg-white p-3"><div className="flex items-center gap-2"><History className="size-4 text-[#b65f3a]" /><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b8d88]">Version history</p></div><div className="mt-3 space-y-2">{versions.slice(0, 8).map((version) => <div key={version.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#eeeae3] bg-[#fbfaf7] px-3 py-2 text-[11px]"><span className="font-semibold text-[#39443f]">v{version.versionNumber}</span><span className="text-[#8b8d88]">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(version.createdAt))}</span><span className={cn("rounded-full px-1.5 py-0.5 font-bold", version.visibility === "client" ? "bg-[#f2e2d8] text-[#a24f31]" : "bg-slate-100 text-slate-600")}>{version.visibility === "client" ? "Client-visible" : "Internal"}</span><span className="text-[#8b8d88]">{version.status === "final" ? "Final" : "Draft"}</span><Button size="sm" variant="ghost" onClick={() => onRestoreVersion(version.id)} disabled={saving} className="ml-auto px-2 text-[11px] text-[#b65f3a]">Restore</Button></div>)}</div></div> : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[#e8e3da] px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
          {status === "final" ? <><Button variant="outline" onClick={onToggleVisibility} disabled={saving}>{visibility === "client" ? "Make internal" : "Make client-visible"}</Button><Button variant="outline" onClick={onReopen} disabled={saving}>Reopen for editing</Button></> : <><Button variant="outline" onClick={onSave} disabled={saving || !content.trim()}>Save draft</Button><Button onClick={onApprove} disabled={saving || !content.trim()} className="bg-[#23313d] hover:bg-[#18242e]">{saving ? "Approving…" : "Approve for client"} <Check /></Button></>}
        </div>
      </div>
    </div>
  )
}

function AppointmentEmailComposer({ appointment, onClose, onSaved }: { appointment: Appointment; onClose: () => void; onSaved: () => void }) {
  const [recipient, setRecipient] = useState(appointment.clientEmail ?? "")
  const [subject, setSubject] = useState(`Follow-up: ${appointment.title}`)
  const [body, setBody] = useState(() => `Hello ${appointment.client.split(" ")[0]},\n\nI’m following up about ${appointment.title} on ${appointmentDayLabel(appointment)} at ${appointmentTimeRange(appointment).split(" – ")[0]}.\n\nPlease reply here if you have any questions or updates before we meet.\n\nBest,\nHarbor Legal`)
  const [saving, setSaving] = useState("")
  const [error, setError] = useState("")

  async function save(status: "draft" | "queued") {
    setSaving(status)
    setError("")
    const action = status === "queued" ? queueAppointmentEmailAction : saveAppointmentEmailDraftAction
    const result = await action({ matterId: appointment.matterId, appointmentId: appointment.id, recipient, subject, body })
    setSaving("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#15212c]/35 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#fbfaf7] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#e8e3da] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b65f3a]">Client communication</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-[#23313d]">Write an email to {appointment.client}</h2>
            <p className="mt-1 text-xs text-[#737872]">Prepare the message now. Queueing stores it in the outbox for your connected delivery provider.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close email composer"><X /></Button>
        </div>
        <div className="space-y-4 overflow-auto p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-xl border border-[#ded9d0] bg-[#f1eee8] p-3 text-xs leading-5 text-[#626b64]"><Mail className="mt-0.5 size-4 shrink-0 text-[#b65f3a]" /><span><strong className="text-[#39443f]">Delivery is provider-ready, not provider-connected.</strong> Saving or queueing this message will not send an email until an email provider is configured.</span></div>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">To</span><Input value={recipient} onChange={(event) => setRecipient(event.target.value)} type="email" placeholder="client@example.com" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Subject</span><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Message</span><textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-64 w-full resize-y rounded-xl border border-[#dcd6cc] bg-white px-3 py-3 text-sm leading-6 text-[#39443f] outline-none transition-colors focus:border-[#b65f3a] focus:ring-2 focus:ring-[#b65f3a]/10" /></label>
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e8e3da] px-5 py-4 sm:px-6"><Button variant="outline" onClick={onClose} disabled={Boolean(saving)}>Cancel</Button><Button variant="outline" onClick={() => save("draft")} disabled={Boolean(saving) || !subject.trim() || !body.trim()}>{saving === "draft" ? "Saving…" : "Save draft"}</Button><Button onClick={() => save("queued")} disabled={Boolean(saving) || !recipient.trim() || !subject.trim() || !body.trim()} className="bg-[#23313d] hover:bg-[#18242e]">{saving === "queued" ? "Queueing…" : "Queue email"} <ArrowUpRight /></Button></div>
      </div>
    </div>
  )
}

function AppointmentDetail({ appointment, onClose, onUpdated }: { appointment: Appointment; onClose: () => void; onUpdated: () => void }) {
  const [savingKey, setSavingKey] = useState("")
  const [error, setError] = useState("")
  const [draftEditor, setDraftEditor] = useState<{ draftId: string; documentId: string; name: string; content: string; status: "draft" | "final"; visibility: "internal" | "client"; versions: NonNullable<Appointment["documents"][number]["versions"]> } | null>(null)
  const [emailComposer, setEmailComposer] = useState(false)
  const [packetUrl, setPacketUrl] = useState<string | null>(null)
  const participants = appointment.participantDetails ?? []
  const hasClientPacketDocuments = appointment.documents.some((document) => document.label === "Intake questionnaire") && appointment.documents.some((document) => document.label === "Engagement letter")
  const packetStatusLabel = !appointment.packet ? "Not created" : appointment.packet.status === "expired" ? "Expired" : appointment.packet.status === "completed" ? "Completed" : appointment.packet.status === "revoked" ? "Revoked" : appointment.packet.viewedAt ? "Viewed" : "Sent"
  const packetStatusClass = packetStatusLabel === "Completed" ? "bg-emerald-50 text-emerald-700" : packetStatusLabel === "Viewed" ? "bg-sky-50 text-sky-700" : packetStatusLabel === "Sent" ? "bg-amber-50 text-amber-700" : packetStatusLabel === "Not created" ? "bg-[#f1eee8] text-[#737872]" : "bg-rose-50 text-rose-700"

  async function runAction(key: string, action: () => Promise<{ ok: true; appointmentId: string } | { ok: false; error: string }>) {
    setSavingKey(key)
    setError("")
    const result = await action()
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    onUpdated()
  }

  async function createDraft(document: Appointment["documents"][number]) {
    if (!document.id || !appointment.matterId) return
    setSavingKey(`draft-${document.id}`)
    setError("")
    const result = await createAppointmentDocumentDraftAction({ matterId: appointment.matterId, documentId: document.id })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDraftEditor({ draftId: result.draftId, documentId: document.id, name: document.label, content: result.content, status: "draft", visibility: "internal", versions: [] })
  }

  async function saveDraft() {
    if (!draftEditor || !appointment.matterId) return
    setSavingKey("draft-save")
    setError("")
    const result = await saveAppointmentDocumentDraftAction({ matterId: appointment.matterId, draftId: draftEditor.draftId, content: draftEditor.content, visibility: draftEditor.visibility })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDraftEditor(null)
    onUpdated()
  }

  async function approveDraft() {
    if (!draftEditor || !appointment.matterId) return
    setSavingKey("draft-approve")
    setError("")
    const saved = await saveAppointmentDocumentDraftAction({ matterId: appointment.matterId, draftId: draftEditor.draftId, content: draftEditor.content, visibility: "client" })
    if (!saved.ok) {
      setSavingKey("")
      setError(saved.error)
      return
    }
    const result = await updateAppointmentDocumentDraftStatusAction({ matterId: appointment.matterId, draftId: draftEditor.draftId, status: "final", visibility: "client" })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDraftEditor((current) => current ? { ...current, status: "final", visibility: "client" } : current)
  }

  async function reopenDraft() {
    if (!draftEditor || !appointment.matterId) return
    setSavingKey("draft-reopen")
    setError("")
    const result = await updateAppointmentDocumentDraftStatusAction({ matterId: appointment.matterId, draftId: draftEditor.draftId, status: "draft", visibility: "internal" })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDraftEditor((current) => current ? { ...current, status: "draft", visibility: "internal" } : current)
  }

  async function toggleDraftVisibility() {
    if (!draftEditor || !appointment.matterId) return
    const visibility = draftEditor.visibility === "client" ? "internal" : "client"
    setSavingKey("draft-visibility")
    setError("")
    const result = await updateAppointmentDocumentDraftVisibilityAction({ matterId: appointment.matterId, draftId: draftEditor.draftId, visibility })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDraftEditor((current) => current ? { ...current, visibility } : current)
  }

  async function restoreDraftVersion(versionId: string) {
    if (!draftEditor || !appointment.matterId) return
    setSavingKey("draft-restore")
    setError("")
    const result = await restoreAppointmentDocumentDraftVersionAction({ matterId: appointment.matterId, draftId: draftEditor.draftId, versionId })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDraftEditor(null)
    onUpdated()
  }

  async function createPacket() {
    if (!appointment.matterId || appointment.isNote) return
    setSavingKey("packet")
    setError("")
    const result = await createAppointmentPacketAction({ matterId: appointment.matterId, appointmentId: appointment.id })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPacketUrl(result.packetUrl)
  }

  async function revokePacket() {
    if (!appointment.matterId || appointment.isNote) return
    setSavingKey("packet-revoke")
    setError("")
    const result = await revokeAppointmentPacketAction({ matterId: appointment.matterId, appointmentId: appointment.id })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPacketUrl(null)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-end bg-[#15212c]/20 backdrop-blur-[1px] sm:p-4">
      <div className="flex h-full w-full max-w-lg flex-col overflow-auto bg-[#fbfaf7] shadow-2xl sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl">
        <div className="border-b border-[#e8e3da] px-5 py-5">
          <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><StatusPill status={appointment.readiness} /><span className="text-xs text-[#8b8d88]">{appointment.type}</span></div><h2 className="mt-3 font-serif text-2xl font-semibold tracking-[-0.02em] text-[#23313d]">{appointment.title}</h2><p className="mt-1 text-sm text-[#737872]">{appointment.client} · {appointment.matter}</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button></div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-[#5f665f]"><div className="rounded-lg bg-[#f1eee8] p-3"><Clock3 className="mb-2 size-4 text-[#b65f3a]" /><span className="block font-semibold">{appointmentDayLabel(appointment)}</span><span className="mt-0.5 block text-[#8b8d88]">{appointmentTimeRange(appointment)}</span></div><div className="rounded-lg bg-[#f1eee8] p-3"><UsersRound className="mb-2 size-4 text-[#b65f3a]" /><span className="block font-semibold">{appointment.isNote ? "Personal note" : `${appointment.participants} participants`}</span><span className="mt-0.5 block text-[#8b8d88]">Owner: {appointment.owner}</span></div></div>
        </div>
        <div className="space-y-6 p-5">{appointment.notes ? <section className="rounded-xl border border-[#e4ded5] bg-[#f8f5ef] p-4"><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">{appointment.isNote ? "Note" : "Internal notes"}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4c5751]">{appointment.notes}</p></section> : null}
          {!appointment.isNote ? <section className="rounded-xl border border-[#e4ded5] bg-white p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Conflict check</h3><p className="mt-1 text-xs text-[#737872]">A clear check is required before this appointment is ready.</p></div><span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", appointment.conflictStatus === "clear" ? "bg-emerald-50 text-emerald-700" : appointment.conflictStatus === "issue" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>{appointment.conflictStatus === "clear" ? "Clear" : appointment.conflictStatus === "issue" ? "Issue" : "Pending"}</span></div><Button size="sm" variant="outline" disabled={Boolean(savingKey)} onClick={() => runAction("conflict", () => updateAppointmentConflictAction({ matterId: appointment.matterId, appointmentId: appointment.id, conflictStatus: appointment.conflictStatus === "clear" ? "pending" : "clear" }))} className="mt-3 border-[#ded9d0] bg-[#fbfaf7]">{savingKey === "conflict" ? "Saving…" : appointment.conflictStatus === "clear" ? "Reopen check" : "Mark conflict clear"}</Button></section> : null}
          {hasClientPacketDocuments ? <section className="rounded-xl border border-[#d8c7bb] bg-[#fffaf6] p-4"><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f2e2d8] text-[#a24f31]"><ShieldCheck className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b604c]">Client preparation packet</h3><p className="mt-1 text-xs leading-5 text-[#737872]">Track the client’s packet without exposing the private link again.</p></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", packetStatusClass)}>{packetStatusLabel}</span></div>{appointment.packet?.viewedAt || appointment.packet?.completedAt ? <p className="mt-3 text-[11px] text-[#737872]">{appointment.packet.completedAt ? `Completed ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(appointment.packet.completedAt))}` : `Viewed ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(appointment.packet.viewedAt!))}`}</p> : null}{appointment.packet?.reminders.length ? <div className="mt-3 space-y-1.5 border-t border-[#eadbd0] pt-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b765f]">Reminder schedule</p>{appointment.packet.reminders.map((reminder) => <div key={reminder.id} className="flex items-center justify-between gap-2 text-[11px] text-[#737872]"><span>{reminder.kind === "first_reminder" ? "First reminder" : "Final reminder"}</span><span className={cn(reminder.status === "planned" ? "text-[#a24f31]" : "text-[#8b8d88]")}>{reminder.status === "cancelled" ? "Cancelled" : reminder.status === "sent" ? "Sent" : `Planned · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(reminder.sendAt))}`}</span></div>)}</div> : null}{packetUrl ? <div className="mt-3 flex flex-wrap items-center gap-2"><a href={packetUrl} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-lg border border-[#e2cfc1] bg-white px-3 py-2 text-xs font-semibold text-[#a24f31] hover:underline">{packetUrl}</a><Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${packetUrl}`) }} className="border-[#d8c1b4] bg-white px-2 text-[11px] text-[#a24f31]">Copy link</Button><Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={revokePacket} className="px-2 text-[11px] text-[#8b604c]">{savingKey === "packet-revoke" ? "Revoking…" : "Revoke link"}</Button></div> : <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" disabled={Boolean(savingKey)} onClick={createPacket} className="border-[#d8c1b4] bg-white px-2 text-[11px] text-[#a24f31]">{savingKey === "packet" ? "Preparing link…" : appointment.packet?.status === "active" ? "Generate replacement link" : "Create secure link"}</Button>{appointment.packet?.status === "active" ? <span className="text-[11px] text-[#9b765f]">The current link is hidden for safety.</span> : null}</div>}</div></div></section> : null}
          <section><div className="flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Preparation tasks</h3><span className="text-xs text-[#8b8d88]">{appointment.checklist.filter((item) => item.done).length}/{appointment.checklist.length} complete</span></div><div className="mt-3 space-y-2">{appointment.checklist.map((item) => <div key={item.id ?? item.label} className="flex items-center gap-3 rounded-lg border border-[#e8e3da] bg-white px-3 py-2.5 text-sm text-[#39443f]"><span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#d5d0c8] text-transparent")}><Check className="size-3" /></span><span className="min-w-0 flex-1"><span className="block">{item.label}</span>{item.isBlocking ? <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-[#9b9d97]">Blocking</span> : null}</span>{item.id && appointment.matterId ? <Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => runAction(`task-${item.id}`, () => updateAppointmentTaskAction({ matterId: appointment.matterId, taskId: item.id!, status: item.done ? "open" : "done" }))} className="shrink-0 px-2 text-[11px] text-[#b65f3a]">{savingKey === `task-${item.id}` ? "Saving…" : item.done ? "Reopen" : "Mark done"}</Button> : null}</div>)}</div></section>
          {!appointment.isNote ? <section><div className="flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Documents</h3><button type="button" className="text-xs font-semibold text-[#b65f3a] hover:underline">Request more</button></div><div className="mt-3 space-y-2">{appointment.documents.map((doc) => <div key={doc.id ?? doc.label} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e8e3da] bg-white px-3 py-2.5 text-sm"><span className="flex min-w-0 flex-1 items-center gap-2 text-[#39443f]"><FileText className="size-4 shrink-0 text-[#9b9c95]" /><span className="truncate">{doc.label}</span></span><span className={cn("text-[11px] font-semibold", doc.draftStatus === "final" ? "text-emerald-700" : doc.draftId ? "text-[#b65f3a]" : doc.status === "ready" ? "text-emerald-700" : doc.status === "missing" ? "text-rose-700" : "text-amber-700")}>{doc.draftStatus === "final" ? "Approved" : doc.draftId ? "Draft ready" : doc.sourceStatus === "waived" ? "Waived" : doc.sourceStatus === "signed" ? "Signed" : doc.status === "ready" ? "Received" : doc.status === "missing" ? "Missing" : "Requested"}</span>{doc.draftId && doc.draftVisibility ? <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", doc.draftVisibility === "client" ? "bg-[#f2e2d8] text-[#a24f31]" : "bg-slate-100 text-slate-600")}>{doc.draftVisibility === "client" ? "Client-visible" : "Internal"}</span> : null}{doc.templateKey && doc.id && appointment.matterId ? <Button size="sm" variant="outline" disabled={Boolean(savingKey)} onClick={() => doc.draftId ? setDraftEditor({ draftId: doc.draftId!, documentId: doc.id!, name: doc.label, content: doc.draftContent ?? "", status: doc.draftStatus ?? "draft", visibility: doc.draftVisibility ?? "internal", versions: doc.versions ?? [] }) : createDraft(doc)} className="shrink-0 border-[#d8c1b4] bg-[#fffaf6] px-2 text-[11px] text-[#a24f31]">{savingKey === `draft-${doc.id}` ? "Preparing…" : doc.draftId ? "Open draft" : "Create draft"}</Button> : null}{doc.id && appointment.matterId ? <Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => runAction(`document-${doc.id}`, () => updateAppointmentDocumentAction({ matterId: appointment.matterId, documentId: doc.id!, status: doc.sourceStatus === "requested" ? "received" : doc.sourceStatus === "signed" ? "requested" : "requested" }))} className="shrink-0 px-2 text-[11px] text-[#b65f3a]">{savingKey === `document-${doc.id}` ? "Saving…" : doc.sourceStatus === "requested" ? "Mark received" : "Reopen"}</Button> : null}{doc.id && appointment.matterId && doc.sourceStatus === "requested" ? <Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => runAction(`waive-${doc.id}`, () => updateAppointmentDocumentAction({ matterId: appointment.matterId, documentId: doc.id!, status: "waived" }))} className="shrink-0 px-2 text-[11px] text-[#737872]">Waive</Button> : null}</div>)}</div></section> : null}
          {!appointment.isNote && participants.length ? <section><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Participants</h3><div className="mt-3 space-y-2">{participants.map((participant) => <div key={participant.id} className="flex items-center gap-3 rounded-lg border border-[#e8e3da] bg-white px-3 py-2.5 text-sm"><span className="min-w-0 flex-1 truncate text-[#39443f]">{participant.displayName}{participant.isRequired ? <span className="ml-1 text-[10px] text-[#9b9d97]">required</span> : null}</span><span className={cn("text-[11px] font-semibold", participant.responseStatus === "confirmed" ? "text-emerald-700" : participant.responseStatus === "declined" ? "text-rose-700" : "text-amber-700")}>{participant.responseStatus === "confirmed" ? "Confirmed" : participant.responseStatus === "declined" ? "Declined" : "Pending"}</span><Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => runAction(`participant-${participant.id}`, () => updateAppointmentParticipantAction({ matterId: appointment.matterId, participantId: participant.id, responseStatus: participant.responseStatus === "confirmed" ? "pending" : "confirmed" }))} className="shrink-0 px-2 text-[11px] text-[#b65f3a]">{savingKey === `participant-${participant.id}` ? "Saving…" : participant.responseStatus === "confirmed" ? "Reopen" : "Confirm"}</Button></div>)}</div></section> : null}
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
          <section><div className="flex items-center justify-between gap-3"><div><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Client communication</h3><p className="mt-1 text-xs text-[#737872]">A single record of every message prepared for this appointment.</p></div><span className="rounded-full bg-[#f1eee8] px-2 py-1 text-[10px] font-bold text-[#737872]">{appointment.communications?.length ?? 0} messages</span></div><div className="mt-3 space-y-2">{appointment.communications?.length ? appointment.communications.slice(0, 4).map((communication) => <div key={communication.id} className="rounded-lg border border-[#e8e3da] bg-white px-3 py-2.5"><div className="flex items-center gap-2"><Mail className="size-3.5 text-[#b65f3a]" /><span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#39443f]">{communication.subject || "Untitled email"}</span><span className={cn("text-[10px] font-bold", communication.status === "sent" ? "text-emerald-700" : communication.status === "failed" ? "text-rose-700" : communication.status === "queued" ? "text-amber-700" : "text-[#8b8d88]")}>{communication.status === "queued" ? "Queued" : communication.status === "sent" ? "Sent" : communication.status === "failed" ? "Failed" : communication.status === "cancelled" ? "Cancelled" : "Draft"}</span></div><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#737872]">{communication.body.replace(/\s+/g, " ").trim()}</p><p className="mt-1 text-[10px] text-[#a1a39d]">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(communication.createdAt))}{communication.recipient ? ` · ${communication.recipient}` : ""}</p></div>) : <div className="rounded-lg border border-dashed border-[#d9d3c9] bg-[#fbfaf7] px-3 py-3 text-xs leading-5 text-[#8b8d88]">No messages yet. Start with a prepared follow-up or client packet note.</div>}</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setEmailComposer(true)} className="flex items-center justify-center gap-2 rounded-lg border border-[#e1dbd1] bg-white px-3 py-2.5 text-xs font-semibold text-[#4d5851] hover:border-[#b65f3a]"><Mail className="size-3.5" /> Email client</button><button type="button" disabled className="flex items-center justify-center gap-2 rounded-lg border border-[#e8e3da] bg-[#f1eee8] px-3 py-2.5 text-xs font-semibold text-[#a1a39d]"><MessageSquareText className="size-3.5" /> Text later</button></div><p className="mt-2 text-xs text-[#8b8d88]">Email messages can be saved as drafts or queued for provider delivery. SMS is planned next.</p></section>
          <div className="flex items-center gap-2 border-t border-[#e8e3da] pt-4"><Button variant="outline" className="flex-1">Move appointment</Button><Button className="flex-1 bg-[#23313d] hover:bg-[#18242e]" onClick={appointment.isNote ? onClose : undefined}>{appointment.isNote ? "Close note" : "Open matter"} <ArrowUpRight /></Button></div>
        </div>
      </div>
      {draftEditor ? <DocumentDraftEditor documentName={draftEditor.name} content={draftEditor.content} status={draftEditor.status} visibility={draftEditor.visibility} versions={draftEditor.versions} saving={savingKey.startsWith("draft-")} onChange={(content) => setDraftEditor((current) => current ? { ...current, content } : current)} onClose={() => setDraftEditor(null)} onApprove={approveDraft} onReopen={reopenDraft} onSave={saveDraft} onToggleVisibility={toggleDraftVisibility} onRestoreVersion={restoreDraftVersion} /> : null}
      {emailComposer ? <AppointmentEmailComposer appointment={appointment} onClose={() => setEmailComposer(false)} onSaved={() => { setEmailComposer(false); onUpdated() }} /> : null}
    </div>
  )
}

function CommunicationCenter({ communications }: { communications: DashboardCommunication[] }) {
  const router = useRouter()
  const [savingId, setSavingId] = useState("")
  const [error, setError] = useState("")
  const queuedCount = communications.filter((communication) => communication.status === "queued").length
  const draftCount = communications.filter((communication) => communication.status === "draft").length
  const failedCount = communications.filter((communication) => communication.status === "failed").length

  async function update(communication: DashboardCommunication, action: "queue" | "retry" | "cancel") {
    setSavingId(communication.id)
    setError("")
    const result = await updateAppointmentCommunicationAction({ matterId: communication.matterId, communicationId: communication.id, action })
    setSavingId("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <section id="communications" className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#e8e3da] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div><div className="flex items-center gap-2"><Send className="size-4 text-[#b65f3a]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Communication outbox</h2><span className="rounded-full bg-[#f1eee8] px-2 py-0.5 text-[10px] font-bold text-[#777b76]">Provider-ready</span></div><p className="mt-1 max-w-xl text-xs leading-5 text-[#8b8d88]">One place to see drafts, queued messages, and delivery issues across your appointments.</p></div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{queuedCount} queued</span><span className="rounded-full bg-[#f1eee8] px-2.5 py-1 text-[#737872]">{draftCount} drafts</span>{failedCount ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">{failedCount} failed</span> : null}</div>
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#ded9d0] bg-[#f1eee8] p-3 text-xs leading-5 text-[#626b64]"><Mail className="mt-0.5 size-4 shrink-0 text-[#b65f3a]" /><span><strong className="text-[#39443f]">Delivery is waiting on a provider connection.</strong> Queueing is safe and durable; it does not send an email by itself.</span></div>
        {error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
        {communications.length ? <div className="space-y-2">{communications.map((communication) => <div key={communication.id} className="grid gap-3 rounded-xl border border-[#e8e3da] bg-white p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.8fr)_auto] lg:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><Mail className="size-4 shrink-0 text-[#b65f3a]" /><p className="truncate text-sm font-semibold text-[#39443f]">{communication.subject || "Untitled email"}</p><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", communication.status === "sent" ? "bg-emerald-50 text-emerald-700" : communication.status === "failed" ? "bg-rose-50 text-rose-700" : communication.status === "queued" ? "bg-amber-50 text-amber-800" : communication.status === "cancelled" ? "bg-slate-100 text-slate-600" : "bg-[#f1eee8] text-[#737872]")}>{communication.status === "queued" ? "Queued" : communication.status === "sent" ? "Sent" : communication.status === "failed" ? "Failed" : communication.status === "cancelled" ? "Cancelled" : "Draft"}</span></div><p className="mt-1 line-clamp-1 text-xs text-[#737872]">{communication.body.replace(/\s+/g, " ").trim()}</p></div><div className="min-w-0 text-xs text-[#737872]"><p className="truncate font-semibold text-[#4d5851]">{communication.client} · {communication.appointment}</p><p className="mt-1 truncate">{communication.recipient || "No recipient yet"} · {communication.matter}</p></div><div className="flex items-center justify-end gap-2">{communication.status === "draft" ? <Button size="sm" variant="outline" disabled={savingId === communication.id} onClick={() => update(communication, "queue")} className="border-[#d8c1b4] bg-[#fffaf6] px-2.5 text-[11px] text-[#a24f31]">{savingId === communication.id ? "Saving…" : "Queue"}</Button> : null}{communication.status === "failed" || communication.status === "cancelled" ? <Button size="sm" variant="outline" disabled={savingId === communication.id} onClick={() => update(communication, "retry")} className="border-[#d8c1b4] bg-[#fffaf6] px-2.5 text-[11px] text-[#a24f31]">{savingId === communication.id ? "Retrying…" : "Retry"}</Button> : null}{communication.status === "draft" || communication.status === "queued" ? <Button size="sm" variant="ghost" disabled={savingId === communication.id} onClick={() => update(communication, "cancel")} className="px-2.5 text-[11px] text-[#737872]">Cancel</Button> : null}</div></div>)}</div> : <div className="rounded-xl border border-dashed border-[#d9d3c9] bg-[#fbfaf7] px-5 py-8 text-center"><Send className="mx-auto size-6 text-[#c8b6a8]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">Your outbox is clear.</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#8b8d88]">Open any appointment, choose Email client, and save a draft or queue a prepared message here.</p></div>}
      </div>
    </section>
  )
}

function DeadlineComposer({ matters, onClose, onSaved }: { matters: Matter[]; onClose: () => void; onSaved: () => void }) {
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState<DashboardDeadline["kind"]>("court_date")
  const [dueAt, setDueAt] = useState("")
  const [priority, setPriority] = useState<DashboardDeadline["priority"]>("normal")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    setSaving(true)
    setError("")
    const result = await createMatterDeadlineAction({ matterId, title, kind, dueAt: dueAt ? new Date(dueAt).toISOString() : "", priority, notes })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved()
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#15212c]/35 p-4 backdrop-blur-[2px]"><div className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-[#fbfaf7] shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-[#e8e3da] px-5 py-4 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b65f3a]">New legal deadline</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#23313d]">Put the date on the record</h2><p className="mt-1 text-xs text-[#737872]">Enter the date your team is responsible for. MatterPilot will not calculate legal rules automatically.</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close deadline composer"><X /></Button></div><div className="space-y-4 overflow-auto p-5 sm:p-6"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Matter</span><select value={matterId} onChange={(event) => setMatterId(event.target.value)} className="h-10 w-full rounded-lg border border-[#dcd6cc] bg-white px-3 text-sm text-[#39443f] outline-none focus:border-[#b65f3a]"><option value="">Select a matter</option>{matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.name} · {matter.matter_number}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Deadline or court date</span><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Motion to suppress filing" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Category</span><select value={kind} onChange={(event) => setKind(event.target.value as DashboardDeadline["kind"])} className="h-10 w-full rounded-lg border border-[#dcd6cc] bg-white px-3 text-sm text-[#39443f] outline-none focus:border-[#b65f3a]"><option value="court_date">Court date</option><option value="filing">Filing</option><option value="discovery">Discovery</option><option value="client">Client</option><option value="internal">Internal</option><option value="other">Other</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Due date and time</span><Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as DashboardDeadline["priority"])} className="h-10 w-full rounded-lg border border-[#dcd6cc] bg-white px-3 text-sm text-[#39443f] outline-none focus:border-[#b65f3a]"><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Notes <span className="font-normal text-[#9b9d97]">(optional)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 w-full resize-y rounded-xl border border-[#dcd6cc] bg-white px-3 py-3 text-sm leading-6 text-[#39443f] outline-none focus:border-[#b65f3a]" placeholder="Add the source, filing instructions, or internal context." /></label>{error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}</div><div className="flex items-center justify-end gap-2 border-t border-[#e8e3da] px-5 py-4 sm:px-6"><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving || !matterId || !title.trim() || !dueAt} className="bg-[#23313d] hover:bg-[#18242e]">{saving ? "Saving…" : "Add deadline"} <CalendarClock /></Button></div></div></div>
}

function DeadlineCenter({ matters, deadlines }: { matters: Matter[]; deadlines: DashboardDeadline[] }) {
  const router = useRouter()
  const [showComposer, setShowComposer] = useState(false)
  const [savingId, setSavingId] = useState("")
  const [error, setError] = useState("")
  const openDeadlines = deadlines.filter((deadline) => ["open", "at_risk", "missed"].includes(deadline.status))
  const atRiskCount = deadlines.filter((deadline) => deadline.status === "at_risk").length
  const missedCount = deadlines.filter((deadline) => deadline.status === "missed").length

  async function update(deadline: DashboardDeadline) {
    setSavingId(deadline.id)
    setError("")
    const result = await updateMatterDeadlineStatusAction({ matterId: deadline.matterId, deadlineId: deadline.id, status: deadline.status === "completed" || deadline.status === "waived" ? "open" : "done" })
    setSavingId("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  function statusLabel(status: DashboardDeadline["status"]) {
    return status === "at_risk" ? "At risk" : status === "missed" ? "Missed" : status === "completed" ? "Completed" : status === "waived" ? "Waived" : "Open"
  }

  return <section id="deadlines" className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="flex flex-col gap-4 border-b border-[#e8e3da] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><CalendarClock className="size-4 text-[#b65f3a]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Deadlines & court dates</h2><span className="rounded-full bg-[#f1eee8] px-2 py-0.5 text-[10px] font-bold text-[#777b76]">Matter-aware</span></div><p className="mt-1 max-w-xl text-xs leading-5 text-[#8b8d88]">The dates your team cannot afford to lose track of, separated from ordinary appointments.</p></div><Button size="sm" onClick={() => setShowComposer(true)} className="bg-[#b65f3a] hover:bg-[#9f5030]"><Plus /> Add deadline</Button></div><div className="grid gap-3 border-b border-[#e8e3da] px-5 py-4 sm:grid-cols-3 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Open</p><p className="mt-1 text-2xl font-semibold text-[#23313d]">{openDeadlines.length}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">At risk</p><p className="mt-1 text-2xl font-semibold text-amber-800">{atRiskCount}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-rose-700">Missed</p><p className="mt-1 text-2xl font-semibold text-rose-800">{missedCount}</p></div></div><div className="p-5 sm:p-6">{error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}{deadlines.length ? <div className="space-y-2">{deadlines.slice(0, 8).map((deadline) => <div key={deadline.id} className="grid gap-3 rounded-xl border border-[#e8e3da] bg-white p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(170px,0.8fr)_auto] lg:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", deadline.kind === "court_date" ? "bg-[#e8eef0] text-[#385367]" : "bg-[#f4e5db] text-[#955033]")}><CalendarClock className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#39443f]">{deadline.title}</p><p className="mt-0.5 truncate text-[11px] text-[#8b8d88]">{deadline.matter} · {deadline.kind.replace("_", " ")}</p></div></div>{deadline.notes ? <p className="mt-2 line-clamp-1 text-xs text-[#737872]">{deadline.notes}</p> : null}</div><div className="text-xs"><p className="font-semibold text-[#4d5851]">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(deadline.dueAt))}</p><p className={cn("mt-1 font-semibold", deadline.priority === "critical" ? "text-rose-700" : deadline.priority === "high" ? "text-amber-700" : "text-[#8b8d88]")}>{deadline.priority === "critical" ? "Critical priority" : deadline.priority === "high" ? "High priority" : "Normal priority"}</p></div><div className="flex items-center justify-end gap-2"><span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", deadline.status === "missed" ? "bg-rose-50 text-rose-700" : deadline.status === "at_risk" ? "bg-amber-50 text-amber-800" : deadline.status === "completed" ? "bg-emerald-50 text-emerald-700" : deadline.status === "waived" ? "bg-slate-100 text-slate-600" : "bg-[#f1eee8] text-[#737872]")}>{statusLabel(deadline.status)}</span><Button size="sm" variant="ghost" disabled={savingId === deadline.id} onClick={() => update(deadline)} className="px-2 text-[11px] text-[#b65f3a]">{savingId === deadline.id ? "Saving…" : deadline.status === "completed" || deadline.status === "waived" ? "Reopen" : "Mark done"}</Button></div></div>)}</div> : <div className="rounded-xl border border-dashed border-[#d9d3c9] bg-[#fbfaf7] px-5 py-8 text-center"><CalendarClock className="mx-auto size-6 text-[#c8b6a8]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">No legal deadlines yet.</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#8b8d88]">Add a court date, filing, discovery deadline, or client commitment to make it visible here.</p></div>}</div>{showComposer ? <DeadlineComposer matters={matters} onClose={() => setShowComposer(false)} onSaved={() => { setShowComposer(false); router.refresh() }} /> : null}</section>
}

function ContactComposer({ matters, onClose, onSaved }: { matters: Matter[]; onClose: () => void; onSaved: () => void }) {
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "")
  const [name, setName] = useState("")
  const [role, setRole] = useState<DashboardContact["role"]>("client")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    setSaving(true)
    setError("")
    const result = await createMatterContactAction({ matterId, displayName: name, contactType: role, email, phone, notes })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved()
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#15212c]/35 p-4 backdrop-blur-[2px]"><div className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-[#fbfaf7] shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-[#e8e3da] px-5 py-4 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b65f3a]">New contact</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#23313d]">Keep the people around a matter close</h2><p className="mt-1 text-xs text-[#737872]">Contacts are scoped to one matter so client and witness information stays separated.</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close contact composer"><X /></Button></div><div className="space-y-4 overflow-auto p-5 sm:p-6"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Matter</span><select value={matterId} onChange={(event) => setMatterId(event.target.value)} className="h-10 w-full rounded-lg border border-[#dcd6cc] bg-white px-3 text-sm text-[#39443f] outline-none focus:border-[#b65f3a]"><option value="">Select a matter</option>{matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.name} · {matter.matter_number}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Full name</span><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jordan Lee" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Role</span><select value={role} onChange={(event) => setRole(event.target.value as DashboardContact["role"])} className="h-10 w-full rounded-lg border border-[#dcd6cc] bg-white px-3 text-sm text-[#39443f] outline-none focus:border-[#b65f3a]"><option value="client">Client</option><option value="prospective_client">Prospective client</option><option value="witness">Witness</option><option value="expert">Expert</option><option value="opposing_counsel">Opposing counsel</option><option value="other">Other</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Email</span><Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="person@example.com" /></label></div><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Phone <span className="font-normal text-[#9b9d97]">(optional)</span></span><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(555) 555-5555" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#5e655f]">Notes <span className="font-normal text-[#9b9d97]">(optional)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 w-full resize-y rounded-xl border border-[#dcd6cc] bg-white px-3 py-3 text-sm leading-6 text-[#39443f] outline-none focus:border-[#b65f3a]" placeholder="Relationship, preferred contact method, or internal context." /></label>{error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}</div><div className="flex items-center justify-end gap-2 border-t border-[#e8e3da] px-5 py-4 sm:px-6"><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving || !matterId || !name.trim()} className="bg-[#23313d] hover:bg-[#18242e]">{saving ? "Saving…" : "Add contact"} <ContactRound /></Button></div></div></div>
}

function ContactCenter({ matters, contacts }: { matters: Matter[]; contacts: DashboardContact[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | DashboardContact["role"]>("all")
  const [showComposer, setShowComposer] = useState(false)
  const [savingId, setSavingId] = useState("")
  const [error, setError] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const filteredContacts = contacts.filter((contact) => (filter === "all" || contact.role === filter) && (!normalizedQuery || `${contact.name} ${contact.matter} ${contact.email ?? ""}`.toLowerCase().includes(normalizedQuery)))
  const activeContacts = contacts.filter((contact) => contact.status === "active")
  const roleLabel = (role: DashboardContact["role"]) => role === "prospective_client" ? "Prospective client" : role === "opposing_counsel" ? "Opposing counsel" : role.charAt(0).toUpperCase() + role.slice(1)

  async function toggle(contact: DashboardContact) {
    setSavingId(contact.id)
    setError("")
    const result = await updateMatterContactStatusAction({ matterId: contact.matterId, contactId: contact.id, status: contact.status === "active" ? "archived" : "active" })
    setSavingId("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return <section id="contacts" className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="flex flex-col gap-4 border-b border-[#e8e3da] px-5 py-5 sm:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><ContactRound className="size-4 text-[#b65f3a]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Client & contact command center</h2><span className="rounded-full bg-[#f1eee8] px-2 py-0.5 text-[10px] font-bold text-[#777b76]">Matter-aware</span></div><p className="mt-1 max-w-xl text-xs leading-5 text-[#8b8d88]">A clean view of the people who shape the work—clients, witnesses, experts, and opposing counsel.</p></div><Button size="sm" onClick={() => setShowComposer(true)} className="bg-[#b65f3a] hover:bg-[#9f5030]"><Plus /> Add contact</Button></div><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-center"><div className="flex items-center gap-2 rounded-lg border border-[#ded9d0] bg-white px-3 py-2"><Search className="size-3.5 text-[#9b9d97]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people or matters" className="w-full bg-transparent text-xs text-[#39443f] outline-none placeholder:text-[#a1a39d]" /></div><select value={filter} onChange={(event) => setFilter(event.target.value as "all" | DashboardContact["role"])} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-xs text-[#39443f] outline-none focus:border-[#b65f3a]"><option value="all">All roles</option><option value="client">Clients</option><option value="prospective_client">Prospective clients</option><option value="witness">Witnesses</option><option value="expert">Experts</option><option value="opposing_counsel">Opposing counsel</option><option value="other">Other</option></select><div className="flex gap-2 text-[11px] font-semibold"><span className="rounded-full bg-[#e8eef0] px-2.5 py-1 text-[#385367]">{activeContacts.length} active</span><span className="rounded-full bg-[#f1eee8] px-2.5 py-1 text-[#737872]">{contacts.length - activeContacts.length} archived</span></div></div></div><div className="p-5 sm:p-6">{error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}{filteredContacts.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredContacts.map((contact) => <article key={contact.id} className={cn("rounded-xl border bg-white p-4", contact.status === "archived" ? "border-[#e8e3da] opacity-65" : "border-[#e2d7cd]")}><div className="flex items-start gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold", contact.role === "client" ? "bg-[#f4e5db] text-[#955033]" : "bg-[#e8eef0] text-[#385367]")}><ContactRound className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#39443f]">{contact.name}</p><p className="mt-0.5 truncate text-[11px] text-[#8b8d88]">{roleLabel(contact.role)} · {contact.matter}</p></div></div><div className="mt-4 space-y-1 text-xs text-[#626b64]">{contact.email ? <a href={`mailto:${contact.email}`} className="block truncate text-[#a24f31] hover:underline">{contact.email}</a> : <p className="text-[#a1a39d]">No email recorded</p>}{contact.phone ? <a href={`tel:${contact.phone}`} className="block text-[#626b64]">{contact.phone}</a> : null}</div>{contact.notes ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#737872]">{contact.notes}</p> : null}<div className="mt-4 flex items-center justify-between border-t border-[#eee9e2] pt-3 text-[10px] text-[#8b8d88]"><span>{contact.appointmentCount} appointments · {contact.openDeadlineCount} open deadlines</span><Button size="sm" variant="ghost" disabled={savingId === contact.id} onClick={() => toggle(contact)} className="px-1.5 text-[10px] text-[#b65f3a]">{savingId === contact.id ? "Saving…" : contact.status === "active" ? "Archive" : "Reactivate"}</Button></div></article>)}</div> : <div className="rounded-xl border border-dashed border-[#d9d3c9] bg-[#fbfaf7] px-5 py-8 text-center"><ContactRound className="mx-auto size-6 text-[#c8b6a8]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">No contacts match this view.</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#8b8d88]">Add a client, witness, expert, or opposing counsel to give every matter a human context.</p></div>}</div>{showComposer ? <ContactComposer matters={matters} onClose={() => setShowComposer(false)} onSaved={() => { setShowComposer(false); router.refresh() }} /> : null}</section>
}

function PacketCenter({ appointments, onSelect, onCreate }: { appointments: Appointment[]; onSelect: (appointment: Appointment) => void; onCreate: () => void }) {
  const router = useRouter()
  const [savingKey, setSavingKey] = useState("")
  const [error, setError] = useState("")
  const [links, setLinks] = useState<Record<string, string>>({})
  const portalAppointments = appointments.filter((appointment) => {
    if (appointment.isNote) return false
    const names = appointment.documents.map((document) => document.label)
    return names.includes("Intake questionnaire") || names.includes("Engagement letter")
  })

  function packetLabel(appointment: Appointment) {
    if (!appointment.packet) return "Not shared"
    if (appointment.packet.status === "completed") return "Completed"
    if (appointment.packet.status === "revoked") return "Revoked"
    if (appointment.packet.status === "expired") return "Expired"
    return appointment.packet.viewedAt ? "Viewed" : "Shared"
  }

  async function createLink(appointment: Appointment) {
    setSavingKey(`create-${appointment.id}`)
    setError("")
    const result = await createAppointmentPacketAction({ matterId: appointment.matterId, appointmentId: appointment.id })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setLinks((current) => ({ ...current, [appointment.id]: result.packetUrl }))
    router.refresh()
  }

  async function revokeLink(appointment: Appointment) {
    setSavingKey(`revoke-${appointment.id}`)
    setError("")
    const result = await revokeAppointmentPacketAction({ matterId: appointment.matterId, appointmentId: appointment.id })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setLinks((current) => {
      const next = { ...current }
      delete next[appointment.id]
      return next
    })
    router.refresh()
  }

  return <section id="portal" className="rounded-2xl border border-[#d8c7bb] bg-[#fffaf6] shadow-sm"><div className="flex flex-col gap-4 border-b border-[#eadbd0] px-5 py-5 sm:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><LockKeyhole className="size-4 text-[#a24f31]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Client portal & document center</h2><span className="rounded-full bg-[#f2e2d8] px-2 py-0.5 text-[10px] font-bold text-[#8b604c]">Secure packet links</span></div><p className="mt-1 max-w-xl text-xs leading-5 text-[#8b6f60]">Approve the client-facing documents, share one private preparation link, and see when the client has opened or completed it.</p></div><div className="flex items-center gap-2 text-[11px] font-semibold text-[#8b604c]"><span className="rounded-full bg-white px-2.5 py-1">{portalAppointments.length} client workflows</span><span className="rounded-full bg-white px-2.5 py-1">{portalAppointments.filter((appointment) => appointment.packet?.status === "completed").length} complete</span></div></div></div><div className="p-5 sm:p-6">{error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}{portalAppointments.length ? <div className="grid gap-3 lg:grid-cols-2">{portalAppointments.map((appointment) => { const clientDocs = appointment.documents.filter((document) => document.label === "Intake questionnaire" || document.label === "Engagement letter"); const approvedCount = clientDocs.filter((document) => document.draftStatus === "final").length; const link = links[appointment.id]; const label = packetLabel(appointment); const statusClass = label === "Completed" ? "bg-emerald-50 text-emerald-700" : label === "Viewed" ? "bg-sky-50 text-sky-700" : label === "Shared" ? "bg-amber-50 text-amber-700" : "bg-[#f1eee8] text-[#737872]"; return <article key={appointment.id} className="rounded-xl border border-[#eadbd0] bg-white p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f2e2d8] text-[#a24f31]"><LockKeyhole className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate text-sm font-semibold text-[#39443f]">{appointment.client}</p><p className="mt-0.5 truncate text-[11px] text-[#8b8d88]">{appointment.matter} · {appointment.title}</p></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", statusClass)}>{label}</span></div></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-[11px]"><div className="rounded-lg bg-[#fffaf6] p-3"><span className="block font-bold uppercase tracking-[0.12em] text-[#9b765f]">Documents</span><span className="mt-1 block font-semibold text-[#5e655f]">{approvedCount}/{clientDocs.length} approved</span></div><div className="rounded-lg bg-[#fffaf6] p-3"><span className="block font-bold uppercase tracking-[0.12em] text-[#9b765f]">Access</span><span className="mt-1 block font-semibold text-[#5e655f]">{appointment.packet?.completedAt ? "Submitted" : appointment.packet?.viewedAt ? "Opened" : "Not opened"}</span></div></div>{link ? <div className="mt-3 flex flex-wrap items-center gap-2"><a href={link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate rounded-lg border border-[#e2cfc1] bg-[#fffaf6] px-3 py-2 text-xs font-semibold text-[#a24f31] hover:underline">{link}</a><Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${link}`) }} className="border-[#d8c1b4] px-2 text-[11px] text-[#a24f31]">Copy</Button></div> : null}<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#f0e5dd] pt-3">{approvedCount === clientDocs.length && clientDocs.length > 0 ? <Button size="sm" disabled={Boolean(savingKey)} onClick={() => createLink(appointment)} className="bg-[#a24f31] hover:bg-[#8f432a]">{savingKey === `create-${appointment.id}` ? "Preparing…" : appointment.packet?.status === "active" ? "Replace secure link" : "Create secure link"}<ArrowUpRight /></Button> : <Button size="sm" variant="outline" onClick={() => onSelect(appointment)} className="border-[#d8c1b4] text-[#a24f31]">Approve documents <ArrowUpRight /></Button>}{appointment.packet?.status === "active" ? <Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => revokeLink(appointment)} className="text-[11px] text-[#8b604c]">{savingKey === `revoke-${appointment.id}` ? "Revoking…" : "Revoke"}</Button> : null}<Button size="sm" variant="ghost" onClick={() => onSelect(appointment)} className="ml-auto text-[11px] text-[#737872]">Open workflow</Button></div></article> })}</div> : <div className="rounded-xl border border-dashed border-[#d9c5b7] bg-white/70 px-5 py-8 text-center"><LockKeyhole className="mx-auto size-6 text-[#c8a897]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">No client portal workflows yet.</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#8b8d88]">Create an initial consultation or client appointment to generate a ready-made intake questionnaire and engagement-letter workflow.</p><Button size="sm" onClick={onCreate} className="mt-4 bg-[#a24f31] hover:bg-[#8f432a]">Start client workflow <Plus /></Button></div>}<p className="mt-4 text-[11px] leading-5 text-[#9b765f]">Client links use the existing one-time preparation packet: they expire automatically, can be revoked, and only show approved intake documents.</p></div></section>
}

function PortalCenter({ appointments, onSelect }: { appointments: Appointment[]; onSelect: (appointment: Appointment) => void }) {
  const router = useRouter()
  const [savingKey, setSavingKey] = useState("")
  const [error, setError] = useState("")
  const portalAppointments = appointments.filter((appointment) => !appointment.isNote && (appointment.clientEmail || appointment.documents.some((document) => document.label === "Intake questionnaire" || document.label === "Engagement letter")))
  const activeCount = portalAppointments.filter((appointment) => appointment.portalAccess?.status === "active").length

  async function enable(appointment: Appointment) {
    setSavingKey(`enable-${appointment.id}`)
    setError("")
    const result = await enableClientPortalAccessAction({ matterId: appointment.matterId, appointmentId: appointment.id })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function revoke(appointment: Appointment) {
    setSavingKey(`revoke-${appointment.id}`)
    setError("")
    const result = await revokeClientPortalAccessAction({ matterId: appointment.matterId, appointmentId: appointment.id })
    setSavingKey("")
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return <section id="verified-portal" className="rounded-2xl border border-[#c8d8dc] bg-[#f7fbfc] shadow-sm"><div className="flex flex-col gap-4 border-b border-[#dce8ea] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#385367]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Verified client portal</h2><span className="rounded-full bg-[#e8eef0] px-2 py-0.5 text-[10px] font-bold text-[#385367]">Email OTP</span></div><p className="mt-1 max-w-xl text-xs leading-5 text-[#63747a]">Give a verified client access to approved matter information. No portal data is shown until the client confirms their email.</p></div><div className="flex items-center gap-2 text-[11px] font-semibold text-[#385367]"><span className="rounded-full bg-white px-2.5 py-1">{portalAppointments.length} eligible</span><span className="rounded-full bg-white px-2.5 py-1">{activeCount} active</span></div></div><div className="p-5 sm:p-6">{error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}{portalAppointments.length ? <div className="grid gap-3 lg:grid-cols-2">{portalAppointments.map((appointment) => { const active = appointment.portalAccess?.status === "active"; return <article key={appointment.id} className="rounded-xl border border-[#dce8ea] bg-white p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><ShieldCheck className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate text-sm font-semibold text-[#39443f]">{appointment.client}</p><p className="mt-0.5 truncate text-[11px] text-[#8b8d88]">{appointment.matter} · {appointment.clientEmail || "Email needed"}</p></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", active ? "bg-emerald-50 text-emerald-700" : appointment.portalAccess?.status === "revoked" ? "bg-rose-50 text-rose-700" : "bg-[#f1eee8] text-[#737872]")}>{active ? "Active" : appointment.portalAccess?.status === "revoked" ? "Revoked" : "Not enabled"}</span></div></div></div><div className="mt-4 rounded-lg bg-[#f7fbfc] p-3 text-xs text-[#63747a]"><span className="font-bold uppercase tracking-[0.12em] text-[#78909a]">Client access</span><p className="mt-1">{appointment.portalAccess?.lastAccessedAt ? `Last opened ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(appointment.portalAccess.lastAccessedAt))}` : active ? "Ready for the client to verify by email." : "No verified access is active."}</p></div><div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#edf2f3] pt-3"><a href="/portal" target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#385367] hover:underline">Open client portal</a>{appointment.clientEmail ? active ? <Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => revoke(appointment)} className="ml-auto text-[11px] text-[#737872]">{savingKey === `revoke-${appointment.id}` ? "Revoking…" : "Revoke access"}</Button> : <Button size="sm" disabled={Boolean(savingKey)} onClick={() => enable(appointment)} className="ml-auto bg-[#385367] hover:bg-[#294351]">{savingKey === `enable-${appointment.id}` ? "Enabling…" : "Enable verified access"}<ShieldCheck /></Button> : <Button size="sm" variant="outline" onClick={() => onSelect(appointment)} className="ml-auto border-[#c8d8dc] text-[#385367]">Add client email <ArrowUpRight /></Button>}</div></article> })}</div> : <div className="rounded-xl border border-dashed border-[#c8d8dc] bg-white/70 px-5 py-8 text-center"><ShieldCheck className="mx-auto size-6 text-[#9bb2ba]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">No verified portal access yet.</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#63747a]">Add a client email to an appointment, then enable access here. The client can sign in at the portal using a one-time email code.</p></div>}<p className="mt-4 text-[11px] leading-5 text-[#78909a]">Access is matter-scoped and revocable. The portal displays only attorney-approved client-visible documents and matching appointment details.</p></div></section>
}

export function MatterPilotDashboard({ matters, initialAppointments = [], initialCommunications = [], initialDeadlines = [], initialContacts = [], userName = "Maya" }: { matters: Matter[]; initialAppointments?: Appointment[]; initialCommunications?: DashboardCommunication[]; initialDeadlines?: DashboardDeadline[]; initialContacts?: DashboardContact[]; userName?: string }) {

  const [showNew, setShowNew] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | undefined>()
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const router = useRouter()
  const [activeNav, setActiveNav] = useState("Calendar")
  const [mobileNav, setMobileNav] = useState(false)
  const [search, setSearch] = useState("")
  const appointments = useMemo(() => initialAppointments, [initialAppointments])
  const filteredAppointments = appointments.filter((appointment) => `${appointment.title} ${appointment.client} ${appointment.matter}`.toLowerCase().includes(search.toLowerCase()))
  const atRisk = appointments.filter((appointment) => appointment.readiness === "at_risk").length
  const blocked = appointments.filter((appointment) => appointment.readiness === "blocked").length

  function openNewAppointment(slot?: AppointmentSlot) {
    setSelectedSlot(slot)
    setShowNew(true)
  }

  const nav = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Calendar", icon: CalendarDays },
    { label: "Matters", icon: Gavel },
    { label: "Intake", icon: UserRound, count: 3 },
    { label: "Tasks", icon: ClipboardCheck, count: 8 },
    { label: "Communications", icon: Send, count: initialCommunications.filter((communication) => communication.status === "queued").length || undefined },
    { label: "Deadlines", icon: CalendarClock, count: initialDeadlines.filter((deadline) => deadline.status === "at_risk" || deadline.status === "missed").length || undefined },
    { label: "Contacts", icon: ContactRound, count: initialContacts.filter((contact) => contact.status === "active").length || undefined },
    { label: "Portal", icon: LockKeyhole, count: appointments.filter((appointment) => !appointment.isNote && appointment.documents.some((document) => document.label === "Intake questionnaire" || document.label === "Engagement letter")).length || undefined },
  ]

  return (
    <div className="min-h-svh bg-[#f4f1eb] text-[#23313d]">
      <div className="flex min-h-svh">
        <aside className={cn("fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#ded9d0] bg-[#1f303d] text-white transition-transform lg:static lg:translate-x-0", mobileNav ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><Link href="/matterpilot" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#c4724c] shadow-lg shadow-[#c4724c]/20"><Command className="size-4" /></span><span><span className="block font-serif text-lg font-semibold tracking-tight">MatterPilot</span><span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-[#aebbc1]">Legal operations</span></span></Link><button type="button" className="lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X className="size-5" /></button></div>
          <div className="flex-1 px-3 py-6"><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a5ae]">Workspace</p><nav className="space-y-1">{nav.map((item) => { const Icon = item.icon; const href = item.label === "Matters" ? "/matters" : item.label === "Intake" ? "/matterpilot/intake" : item.label === "Tasks" ? "/matterpilot#tasks" : `/matterpilot#${item.label.toLowerCase()}`; return <Link key={item.label} href={href} onClick={() => { setActiveNav(item.label); setMobileNav(false) }} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors", activeNav === item.label ? "bg-white/12 text-white shadow-sm" : "text-[#b8c2c6] hover:bg-white/7 hover:text-white")}><span className="flex items-center gap-3"><Icon className="size-4" />{item.label}</span>{item.count ? <span className="rounded-full bg-[#314552] px-2 py-0.5 text-[10px] font-bold text-[#c8d1d4]">{item.count}</span> : null}</Link> })}</nav><div className="my-7 border-t border-white/10" /><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a5ae]">Tools</p><nav className="space-y-1"><Link href="/matters" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#b8c2c6] transition-colors hover:bg-white/7 hover:text-white"><Sparkles className="size-4" />TraceLine intelligence</Link><Link href="/matterpilot#settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#b8c2c6] transition-colors hover:bg-white/7 hover:text-white"><Settings2 className="size-4" />Settings</Link></nav></div>
          <div id="settings" className="border-t border-white/10 p-4"><div className="mb-3 flex items-center gap-3 rounded-lg bg-white/7 p-3"><MiniAvatar label={userName.slice(0, 2).toUpperCase()} tone="copper" /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{userName} Chen</span><span className="block text-[10px] text-[#9eafb6]">Attorney · Harbor Legal</span></span><ChevronDown className="ml-auto size-3 text-[#92a2a9]" /></div><SignOutButton /></div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-[#ded9d0] bg-[#fbfaf7]/80 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-[#54615e] hover:bg-[#eeeae3] lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">Monday · September 21, 2026</p><h1 className="mt-0.5 font-serif text-xl font-semibold tracking-[-0.02em] text-[#23313d] sm:text-2xl">Good morning, {userName}</h1></div></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-xs text-[#8a8d87] md:flex"><Search className="size-3.5" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search matters, people, events" className="w-44 bg-transparent outline-none placeholder:text-[#a1a39d]" /></div><Button variant="outline" size="icon" className="border-[#ded9d0] bg-white" aria-label="Notifications"><Bell className="size-4" /></Button><Button onClick={() => setShowNew(true)} className="hidden bg-[#b65f3a] shadow-sm shadow-[#b65f3a]/20 hover:bg-[#9f5030] sm:inline-flex"><Plus /> New appointment</Button></div></header>

          <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-6 sm:px-7 sm:py-8">
            <section id="overview" className="relative overflow-hidden rounded-2xl bg-[#23313d] px-5 py-6 text-white shadow-xl shadow-[#23313d]/10 sm:px-7 sm:py-8"><div className="absolute -right-16 -top-24 size-72 rounded-full border border-white/10" /><div className="absolute -right-6 -top-14 size-52 rounded-full border border-white/10" /><div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5a083]"><span className="size-1.5 rounded-full bg-[#d5a083]" /> Your week at a glance</div><h2 className="max-w-xl font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">Keep every matter moving<br /><span className="text-[#d5a083]">before the calendar does.</span></h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#b9c5ca]">MatterPilot turns appointments into prepared, accountable workflows—so your team knows what is ready, what is at risk, and what needs attention next.</p></div><div className="flex shrink-0 items-end gap-7"><div><p className="text-3xl font-semibold tracking-tight">{appointments.length}</p><p className="mt-1 text-[11px] text-[#aab8be]">appointments</p></div><div><p className="text-3xl font-semibold tracking-tight text-[#e9b18e]">{atRisk + blocked}</p><p className="mt-1 text-[11px] text-[#aab8be]">need attention</p></div><div><p className="text-3xl font-semibold tracking-tight">{appointments.reduce((sum, appointment) => sum + appointment.participants, 0)}</p><p className="mt-1 text-[11px] text-[#aab8be]">participants</p></div></div></div></section>

            <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#ded9d0] bg-[#fbfaf7] p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#5c665f]"><span className="size-2 rounded-full bg-emerald-500" /> Ready</span><CheckCircle2 className="size-4 text-emerald-600" /></div><p className="mt-3 text-2xl font-semibold text-[#23313d]">{appointments.filter((a) => a.readiness === "ready").length}</p><p className="mt-1 text-xs text-[#8b8d88]">Fully prepared events</p></div><div className="rounded-xl border border-[#ded9d0] bg-[#fbfaf7] p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#5c665f]"><span className="size-2 rounded-full bg-amber-500" /> At risk</span><AlarmClock className="size-4 text-amber-600" /></div><p className="mt-3 text-2xl font-semibold text-[#23313d]">{atRisk}</p><p className="mt-1 text-xs text-[#8b8d88]">Missing a preparation step</p></div><div className="rounded-xl border border-[#ded9d0] bg-[#fbfaf7] p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#5c665f]"><span className="size-2 rounded-full bg-rose-500" /> Blocked</span><ShieldCheck className="size-4 text-rose-600" /></div><p className="mt-3 text-2xl font-semibold text-[#23313d]">{blocked}</p><p className="mt-1 text-xs text-[#8b8d88]">Needs owner attention</p></div></section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <CalendarBoard appointments={filteredAppointments} onSelect={setSelectedAppointment} onCreate={openNewAppointment} />

              <div id="tasks" className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="flex items-start justify-between border-b border-[#e8e3da] px-5 py-4"><div><h2 className="font-serif text-xl font-semibold text-[#23313d]">Needs attention</h2><p className="mt-1 text-xs text-[#8b8d88]">The next best actions for your team</p></div><button type="button" className="rounded-lg p-2 text-[#8b8d88] hover:bg-[#eeeae3]" aria-label="More actions"><MoreHorizontal className="size-4" /></button></div>{appointments.filter((appointment) => appointment.readiness !== "ready").map((appointment) => <ReadinessCard key={appointment.id} appointment={appointment} onSelect={() => setSelectedAppointment(appointment)} />)}<div className="border-t border-[#e8e3da] px-5 py-4"><a href="#tasks" className="flex items-center gap-2 text-xs font-semibold text-[#b65f3a] hover:underline">View all tasks <ArrowUpRight className="size-3.5" /></a></div></div>
            </section>

            <CommunicationCenter communications={initialCommunications} />

            <DeadlineCenter matters={matters} deadlines={initialDeadlines} />

            <ContactCenter matters={matters} contacts={initialContacts} />
            <PacketCenter appointments={appointments} onSelect={setSelectedAppointment} onCreate={() => openNewAppointment()} />
            <PortalCenter appointments={appointments} onSelect={setSelectedAppointment} />

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"><div className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-serif text-xl font-semibold text-[#23313d]">Your matters</h2><p className="mt-1 text-xs text-[#8b8d88]">Every appointment has a home</p></div><Link href="/matters" className="text-xs font-semibold text-[#b65f3a] hover:underline">View all matters <ArrowUpRight className="ml-1 inline size-3" /></Link></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{(matters.length > 0 ? matters.slice(0, 4) : [{ id: "demo", name: "Harlow v. Green", matter_number: "DEMO-001", case_mode: "civil_defense", status: "active" }]).map((matter, index) => <Link href={matter.id === "demo" ? "/matters" : `/matters/${matter.id}`} key={matter.id} className="group flex items-center gap-3 rounded-xl border border-[#e6e0d7] bg-white p-3 transition-colors hover:border-[#c08a6d] hover:bg-[#fffaf6]"><span className={cn("flex size-9 items-center justify-center rounded-lg text-xs font-bold", index % 2 === 0 ? "bg-[#e8eef0] text-[#385367]" : "bg-[#f4e5db] text-[#955033]")}><Gavel className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#35433e]">{matter.name}</span><span className="mt-0.5 block text-[11px] text-[#8b8d88]">{matter.matter_number} · {matter.status}</span></span><ArrowUpRight className="size-4 text-[#a6a9a2] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>)}</div></div><div className="rounded-2xl border border-[#d5c8b9] bg-[#ead9c4] p-5 shadow-sm"><div className="flex items-center gap-2 text-[#6f4f3c]"><Link2 className="size-4" /><span className="text-xs font-bold uppercase tracking-[0.16em]">Public booking</span></div><h2 className="mt-4 font-serif text-2xl font-semibold leading-tight text-[#3b3029]">Let clients book the right time.</h2><p className="mt-2 text-sm leading-6 text-[#705d50]">Share a branded intake link that checks conflicts and collects the basics before a consultation lands on your calendar.</p><Link href="/book/demo" className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#3b3029] px-3.5 text-sm font-semibold text-[#fffaf4] transition-colors hover:bg-[#514238]">Preview booking link <ArrowUpRight className="size-4" /></Link></div></section>
          </div>
        </main>
      </div>
      <button type="button" onClick={() => setShowNew(true)} className="fixed bottom-5 right-5 z-20 flex size-12 items-center justify-center rounded-full bg-[#b65f3a] text-white shadow-xl shadow-[#b65f3a]/30 sm:hidden" aria-label="New appointment"><Plus className="size-5" /></button>
      {showNew ? <AppointmentComposer matters={matters} initialSlot={selectedSlot} onClose={() => { setShowNew(false); setSelectedSlot(undefined); router.refresh() }} /> : null}
      {selectedAppointment ? <AppointmentDetail appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} onUpdated={() => { setSelectedAppointment(null); router.refresh() }} /> : null}
    </div>
  )
}
