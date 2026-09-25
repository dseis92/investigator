"use client"

import Link from "next/link"
import {
  Activity,
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
  List,
  Mail,
  Menu,
  MessageSquareText,
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
import { useMemo, useState, type DragEvent } from "react"
import { useRouter } from "next/navigation"

import { SignOutButton } from "@/components/sign-out-button"
import {
  createAppointmentDocumentDraftAction,
  createAppointmentAction,
  createAppointmentPacketAction,
  cancelCalendarBlackoutAction,
  createCalendarBlackoutAction,
  createClientPortalDocumentRequestAction,
  enableClientPortalAccessAction,
  createMatterDeadlineAction,
  createMatterContactAction,
  queueAppointmentEmailAction,
  revokeAppointmentPacketAction,
  revokeClientPortalAccessAction,
  createClientPortalDocumentDownloadUrlAction,
  reviewClientPortalDocumentAction,
  saveAppointmentEmailDraftAction,
  saveAppointmentDocumentDraftAction,
  restoreAppointmentDocumentDraftVersionAction,
  saveCalendarAvailabilityAction,
  sendFirmPortalMessageAction,
  rescheduleAppointmentAction,
  updateAppointmentDocumentDraftStatusAction,
  updateAppointmentDocumentDraftVisibilityAction,
  updateAppointmentConflictAction,
  updateAppointmentDocumentAction,
  updateAppointmentCommunicationAction,
  updateMatterDeadlineStatusAction,
  updateMatterContactStatusAction,
  updateAppointmentParticipantAction,
  updateAppointmentTaskAction,
  createAppointmentTaskDependencyAction,
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

export type DashboardView = "overview" | "calendar" | "tasks" | "communications" | "deadlines" | "contacts" | "portal"

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

export type DashboardAvailabilityRule = {
  id: string
  matterId: string
  weekday: number
  startTime: string
  endTime: string
  timezone: string
  label: string | null
}

export type DashboardBlackout = {
  id: string
  matterId: string
  startsAt: string
  endsAt: string
  reason: string
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
  provider: string | null
  errorMessage: string | null
  attemptCount: number
  lastAttemptAt: string | null
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
  duplicateMatterNames: string[]
}

export type DashboardPortalMessage = {
  id: string
  matterId: string
  matter: string
  senderRole: "client" | "firm"
  senderEmail: string
  body: string
  createdAt: string
}

export type DashboardPortalDocumentRequest = {
  id: string
  matterId: string
  matter: string
  appointmentId: string | null
  title: string
  description: string
  status: "requested" | "uploaded" | "approved" | "rejected"
  fileName: string | null
  mimeType: string | null
  sizeBytes: number | null
  uploadedAt: string | null
  reviewerNote: string | null
  createdAt: string
}

export type DashboardMember = { userId: string; name: string; email: string; role: string }

export type DashboardTask = {
  id: string
  matterId: string
  matter: string
  appointmentId: string
  appointment: string
  label: string
  status: "open" | "done" | "waived"
  isBlocking: boolean
  dueAt: string | null
  assignedTo: string | null
  assignedName: string
  dependencies: { id: string; taskId: string; dependsOnTaskId: string; dependsOnLabel: string; dependsOnStatus: "open" | "done" | "waived" }[]
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

type CalendarMoveResult = { ok: true; appointmentId: string } | { ok: false; error: string }

function CalendarBoardEnhanced({ appointments, onSelect, onCreate, onMove }: { appointments: Appointment[]; onSelect: (appointment: Appointment) => void; onCreate: (slot?: AppointmentSlot) => void; onMove: (appointment: Appointment, startsAt: string, endsAt: string) => Promise<CalendarMoveResult> }) {
  const firstDatedAppointment = appointments.find((appointment) => appointment.startAt)?.startAt
  const [anchor, setAnchor] = useState(() => startOfWorkWeek(firstDatedAppointment ? new Date(firstDatedAppointment) : new Date()))
  const [view, setView] = useState<"week" | "day" | "month" | "agenda">("week")
  const [selectedDay, setSelectedDay] = useState(() => firstDatedAppointment ? new Date(firstDatedAppointment) : new Date())
  const [filter, setFilter] = useState<CalendarFilter>("all")
  const [message, setMessage] = useState("")
  const days = workWeekDays(anchor)
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthGridStart = new Date(monthStart)
  monthGridStart.setDate(1 - monthStart.getDay())
  const monthDays = Array.from({ length: 42 }, (_, index) => { const day = new Date(monthGridStart); day.setDate(monthGridStart.getDate() + index); return day })
  const rangeDays = view === "day" ? [selectedDay] : view === "month" ? monthDays : days
  const visibleAppointments = appointments.filter((appointment) => {
    const date = calendarEventDate(appointment)
    if (!date || !rangeDays.some((day) => localDateKey(day) === localDateKey(date))) return false
    if (filter === "notes") return Boolean(appointment.isNote)
    if (filter !== "all") return appointment.readiness === filter && !appointment.isNote
    return true
  })

  function moveRange(amount: number) {
    const next = new Date(anchor)
    if (view === "month") next.setMonth(next.getMonth() + amount)
    else if (view === "day") next.setDate(next.getDate() + amount)
    else next.setDate(next.getDate() + amount * 7)
    setAnchor(next)
    setSelectedDay(next)
  }

  function currentLabel() {
    if (view === "day") return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(selectedDay)
    if (view === "month") return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(anchor)
    return `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(days[0])} – ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(days[4])}`
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, appointment: Appointment) {
    event.dataTransfer.setData("text/matterpilot-appointment", appointment.id)
    event.dataTransfer.effectAllowed = "move"
  }

  async function handleDrop(event: DragEvent<HTMLElement>, day: Date, hour = 9) {
    event.preventDefault()
    const appointmentId = event.dataTransfer.getData("text/matterpilot-appointment")
    const appointment = appointments.find((item) => item.id === appointmentId)
    if (!appointment || appointment.isNote || !appointment.startAt || !appointment.endAt) return
    const startsAt = new Date(`${localDateKey(day)}T${String(hour).padStart(2, "0")}:00:00`).toISOString()
    const duration = new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()
    const result = await onMove(appointment, startsAt, new Date(new Date(startsAt).getTime() + duration).toISOString())
    setMessage(result.ok ? "Appointment moved and conflict-checked." : result.error)
  }

  const appointmentsForDay = (day: Date) => visibleAppointments.filter((appointment) => calendarEventDate(appointment) && localDateKey(calendarEventDate(appointment)!) === localDateKey(day)).sort((a, b) => calendarEventHour(a) - calendarEventHour(b))
  const renderCompactAppointment = (appointment: Appointment) => <button key={appointment.id} type="button" draggable={!appointment.isNote} onDragStart={(event) => handleDragStart(event, appointment)} onClick={() => onSelect(appointment)} className={cn("w-full truncate rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors hover:-translate-y-0.5 hover:shadow-sm", appointment.isNote ? "border-[#c8d8dc] bg-[#f1f7f8] text-[#385367]" : STATUS[appointment.readiness].accent)}>{formatTime(calendarEventHour(appointment))} · {appointment.title}</button>

  return <div id="calendar" className="min-w-0 rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="flex flex-col gap-4 border-b border-[#e8e3da] px-5 py-4 sm:px-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-serif text-xl font-semibold text-[#23313d]">Calendar</h2><span className="rounded-full bg-[#eeeae3] px-2 py-0.5 text-[10px] font-bold text-[#777b76]">Operations view</span></div><p className="mt-1 text-xs text-[#8b8d88]">{currentLabel()} · Drag an appointment to move it, or click an open slot to add one.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-1 rounded-lg border border-[#ded9d0] bg-white p-1" role="group" aria-label="Calendar view"><button type="button" onClick={() => setView("week")} className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-semibold", view === "week" ? "bg-[#23313d] text-white" : "text-[#7b817b] hover:bg-[#f1eee8]")}>Week</button><button type="button" onClick={() => setView("day")} className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-semibold", view === "day" ? "bg-[#23313d] text-white" : "text-[#7b817b] hover:bg-[#f1eee8]")}>Day</button><button type="button" onClick={() => setView("month")} className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-semibold", view === "month" ? "bg-[#23313d] text-white" : "text-[#7b817b] hover:bg-[#f1eee8]")}>Month</button><button type="button" onClick={() => setView("agenda")} className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-semibold", view === "agenda" ? "bg-[#23313d] text-white" : "text-[#7b817b] hover:bg-[#f1eee8]")}>Agenda</button></div><button type="button" onClick={() => { const today = new Date(); setAnchor(startOfWorkWeek(today)); setSelectedDay(today) }} className="rounded-lg border border-[#ded9d0] bg-white px-2.5 py-2 text-[11px] font-semibold text-[#59645e] hover:border-[#c08a6d]">Today</button><button type="button" onClick={() => moveRange(-1)} className="rounded-lg p-2 text-[#69736d] hover:bg-[#eeeae3]" aria-label="Previous calendar range"><ChevronLeft className="size-4" /></button><button type="button" onClick={() => moveRange(1)} className="rounded-lg p-2 text-[#69736d] hover:bg-[#eeeae3]" aria-label="Next calendar range"><ChevronRight className="size-4" /></button></div></div><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Calendar filters"><span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b9d97]">Show</span>{(["all", "ready", "at_risk", "blocked", "notes"] as CalendarFilter[]).map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold", filter === option ? "border-[#b65f3a] bg-[#fff5ef] text-[#a24f31]" : "border-[#e1dbd1] bg-white text-[#7b817b] hover:border-[#c08a6d]")}>{option === "all" ? "Everything" : option === "at_risk" ? "At risk" : option === "notes" ? "Notes" : option[0].toUpperCase() + option.slice(1)}</button>)}</div>{message ? <p className={cn("text-[11px] font-semibold", message.includes("moved") ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}</div></div>{view === "month" ? <div className="grid grid-cols-7 gap-px bg-[#e8e3da] p-px">{monthDays.map((day) => <div key={localDateKey(day)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => void handleDrop(event, day)} className={cn("min-h-28 bg-[#fbfaf7] p-2", day.getMonth() !== anchor.getMonth() ? "opacity-45" : "")}><button type="button" onClick={() => { setSelectedDay(day); setView("day") }} className="mb-2 text-xs font-semibold text-[#5f665f] hover:text-[#b65f3a]">{day.getDate()}</button><div className="space-y-1">{appointmentsForDay(day).slice(0, 4).map(renderCompactAppointment)}</div></div>)}</div> : view === "day" ? <div className="grid grid-cols-[58px_minmax(0,1fr)]">{<div>{TIMES.map((time) => <div key={time} className="h-[76px] border-b border-[#eeeae3] pr-2 pt-1 text-right text-[10px] text-[#a1a39d]">{time > 12 ? time - 12 : time}{time >= 12 ? "p" : "a"}</div>)}</div>}<div className="relative">{TIMES.map((time) => <div key={time} onDragOver={(event) => event.preventDefault()} onDrop={(event) => void handleDrop(event, selectedDay, time)} className="relative h-[76px] border-b border-[#eeeae3] bg-white/30"><button type="button" onClick={() => onCreate({ date: localDateKey(selectedDay), time: `${String(time).padStart(2, "0")}:00` })} className="absolute inset-0 rounded-sm hover:bg-[#fff5ef]" />{appointmentsForDay(selectedDay).filter((appointment) => Math.floor(calendarEventHour(appointment)) === time).map(renderCompactAppointment)}</div>)}</div></div> : view === "agenda" ? <div className="divide-y divide-[#e8e3da] px-5 sm:px-6">{rangeDays.map((day) => <div key={localDateKey(day)} className="py-4"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b765f]">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(day)}</p><button type="button" onClick={() => onCreate({ date: localDateKey(day), time: "09:00" })} className="text-[11px] font-semibold text-[#b65f3a] hover:underline"><Plus className="mr-1 inline size-3" />Add</button></div>{appointmentsForDay(day).length ? <div className="space-y-2">{appointmentsForDay(day).map(renderCompactAppointment)}</div> : <p className="rounded-xl border border-dashed border-[#d8d1c6] bg-[#faf8f4] px-4 py-4 text-xs text-[#8b8d88]">No appointments scheduled.</p>}</div>)}</div> : <div className="overflow-x-auto"><div className="min-w-[780px]"><div className="grid grid-cols-[58px_repeat(5,minmax(140px,1fr))] border-b border-[#e8e3da]"><div />{days.map((day) => <button key={localDateKey(day)} type="button" onClick={() => { setSelectedDay(day); setView("day") }} className="px-2 py-3 text-center hover:bg-[#fff5ef]"><span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b8d88]">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}</span><span className={cn("mt-1 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold", localDateKey(day) === localDateKey(new Date()) ? "bg-[#b65f3a] text-white" : "text-[#23313d]")}>{day.getDate()}</span></button>)}</div><div className="grid grid-cols-[58px_repeat(5,minmax(140px,1fr))]"><div>{TIMES.map((time) => <div key={time} className="h-[76px] border-b border-[#eeeae3] pr-2 pt-1 text-right text-[10px] text-[#a1a39d]">{time > 12 ? time - 12 : time}{time >= 12 ? "p" : "a"}</div>)}</div>{days.map((day) => <div key={localDateKey(day)} className="relative border-l border-[#eeeae3]">{TIMES.map((time) => <div key={time} onDragOver={(event) => event.preventDefault()} onDrop={(event) => void handleDrop(event, day, time)} className="relative h-[76px] border-b border-[#eeeae3]"><button type="button" aria-label={`Create appointment on ${localDateKey(day)} at ${formatTime(time)}`} onClick={() => onCreate({ date: localDateKey(day), time: `${String(time).padStart(2, "0")}:00` })} className="absolute inset-0 z-0 rounded-sm hover:bg-[#fff5ef]" /></div>)}{appointmentsForDay(day).map((appointment) => <button key={appointment.id} type="button" draggable={!appointment.isNote} onDragStart={(event) => handleDragStart(event, appointment)} onClick={() => onSelect(appointment)} className={cn("group absolute inset-x-1 z-10 overflow-hidden rounded-lg border p-2 text-left shadow-sm", appointment.isNote ? "border-[#c8d8dc] bg-[#f1f7f8] text-[#385367]" : STATUS[appointment.readiness].accent)} style={{ top: `${(calendarEventHour(appointment) - 8) * 76 + 4}px`, height: `${Math.max((calendarEventEndHour(appointment) - calendarEventHour(appointment)) * 76 - 8, 58)}px` }}><span className="block truncate text-[11px] font-bold">{appointment.title}</span><span className="mt-1 block truncate text-[11px] opacity-75">{appointment.client}</span><span className="mt-2 block text-[10px] opacity-65">{formatTime(calendarEventHour(appointment))}</span></button>)}</div>)}</div></div></div>}</div>
}

// Retained for reference while the enhanced operations view is rolled out.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const [rescheduleDate, setRescheduleDate] = useState(() => appointment.startAt ? new Date(appointment.startAt).toISOString().slice(0, 10) : "")
  const [rescheduleTime, setRescheduleTime] = useState(() => appointment.startAt ? `${String(new Date(appointment.startAt).getHours()).padStart(2, "0")}:${String(new Date(appointment.startAt).getMinutes()).padStart(2, "0")}` : "09:00")
  const [rescheduleReason, setRescheduleReason] = useState("")
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

  async function reschedule() {
    if (!appointment.matterId || !appointment.startAt || !appointment.endAt || !rescheduleDate || !rescheduleTime) return
    const startsAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString()
    const duration = new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()
    const endsAt = new Date(new Date(startsAt).getTime() + duration).toISOString()
    await runAction("reschedule", () => rescheduleAppointmentAction({
      matterId: appointment.matterId,
      appointmentId: appointment.id,
      startsAt,
      endsAt,
      reason: rescheduleReason,
    }))
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
          {!appointment.isNote ? <section className="rounded-xl border border-[#d8e1e4] bg-[#f7fbfc] p-4"><div className="flex items-start gap-3"><CalendarClock className="mt-0.5 size-4 shrink-0 text-[#385367]" /><div className="min-w-0 flex-1"><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#385367]">Move appointment</h3><p className="mt-1 text-xs leading-5 text-[#63747a]">The original time is preserved in the appointment history. MatterPilot will reject blocked or overlapping times.</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><label className="text-[11px] text-[#63747a]">New date<input type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#c8d8dc] bg-white px-2 text-xs text-[#39443f]" /></label><label className="text-[11px] text-[#63747a]">New time<input type="time" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#c8d8dc] bg-white px-2 text-xs text-[#39443f]" /></label></div><input value={rescheduleReason} onChange={(event) => setRescheduleReason(event.target.value)} placeholder="Reason (optional)" className="mt-2 h-9 w-full rounded-lg border border-[#c8d8dc] bg-white px-3 text-xs text-[#39443f] outline-none focus:border-[#385367]" /><Button size="sm" onClick={reschedule} disabled={Boolean(savingKey) || !rescheduleDate || !rescheduleTime} className="mt-3 bg-[#385367] hover:bg-[#294351]">{savingKey === "reschedule" ? "Moving…" : "Save new time"}<CalendarClock /></Button></section> : null}
          {hasClientPacketDocuments ? <section className="rounded-xl border border-[#d8c7bb] bg-[#fffaf6] p-4"><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f2e2d8] text-[#a24f31]"><ShieldCheck className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b604c]">Client preparation packet</h3><p className="mt-1 text-xs leading-5 text-[#737872]">Track the client’s packet without exposing the private link again.</p></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", packetStatusClass)}>{packetStatusLabel}</span></div>{appointment.packet?.viewedAt || appointment.packet?.completedAt ? <p className="mt-3 text-[11px] text-[#737872]">{appointment.packet.completedAt ? `Completed ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(appointment.packet.completedAt))}` : `Viewed ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(appointment.packet.viewedAt!))}`}</p> : null}{appointment.packet?.reminders.length ? <div className="mt-3 space-y-1.5 border-t border-[#eadbd0] pt-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b765f]">Reminder schedule</p>{appointment.packet.reminders.map((reminder) => <div key={reminder.id} className="flex items-center justify-between gap-2 text-[11px] text-[#737872]"><span>{reminder.kind === "first_reminder" ? "First reminder" : "Final reminder"}</span><span className={cn(reminder.status === "planned" ? "text-[#a24f31]" : "text-[#8b8d88]")}>{reminder.status === "cancelled" ? "Cancelled" : reminder.status === "sent" ? "Sent" : `Planned · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(reminder.sendAt))}`}</span></div>)}</div> : null}{packetUrl ? <div className="mt-3 flex flex-wrap items-center gap-2"><a href={packetUrl} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-lg border border-[#e2cfc1] bg-white px-3 py-2 text-xs font-semibold text-[#a24f31] hover:underline">{packetUrl}</a><Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${packetUrl}`) }} className="border-[#d8c1b4] bg-white px-2 text-[11px] text-[#a24f31]">Copy link</Button><Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={revokePacket} className="px-2 text-[11px] text-[#8b604c]">{savingKey === "packet-revoke" ? "Revoking…" : "Revoke link"}</Button></div> : <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" disabled={Boolean(savingKey)} onClick={createPacket} className="border-[#d8c1b4] bg-white px-2 text-[11px] text-[#a24f31]">{savingKey === "packet" ? "Preparing link…" : appointment.packet?.status === "active" ? "Generate replacement link" : "Create secure link"}</Button>{appointment.packet?.status === "active" ? <span className="text-[11px] text-[#9b765f]">The current link is hidden for safety.</span> : null}</div>}</div></div></section> : null}
          <section><div className="flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Preparation tasks</h3><span className="text-xs text-[#8b8d88]">{appointment.checklist.filter((item) => item.done).length}/{appointment.checklist.length} complete</span></div><div className="mt-3 space-y-2">{appointment.checklist.map((item) => <div key={item.id ?? item.label} className="flex items-center gap-3 rounded-lg border border-[#e8e3da] bg-white px-3 py-2.5 text-sm text-[#39443f]"><span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#d5d0c8] text-transparent")}><Check className="size-3" /></span><span className="min-w-0 flex-1"><span className="block">{item.label}</span>{item.isBlocking ? <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-[#9b9d97]">Blocking</span> : null}</span>{item.id && appointment.matterId ? <Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => runAction(`task-${item.id}`, () => updateAppointmentTaskAction({ matterId: appointment.matterId, taskId: item.id!, status: item.done ? "open" : "done" }))} className="shrink-0 px-2 text-[11px] text-[#b65f3a]">{savingKey === `task-${item.id}` ? "Saving…" : item.done ? "Reopen" : "Mark done"}</Button> : null}</div>)}</div></section>
          {!appointment.isNote ? <section><div className="flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Documents</h3><button type="button" className="text-xs font-semibold text-[#b65f3a] hover:underline">Request more</button></div><div className="mt-3 space-y-2">{appointment.documents.map((doc) => <div key={doc.id ?? doc.label} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e8e3da] bg-white px-3 py-2.5 text-sm"><span className="flex min-w-0 flex-1 items-center gap-2 text-[#39443f]"><FileText className="size-4 shrink-0 text-[#9b9c95]" /><span className="truncate">{doc.label}</span></span><span className={cn("text-[11px] font-semibold", doc.draftStatus === "final" ? "text-emerald-700" : doc.draftId ? "text-[#b65f3a]" : doc.status === "ready" ? "text-emerald-700" : doc.status === "missing" ? "text-rose-700" : "text-amber-700")}>{doc.draftStatus === "final" ? "Approved" : doc.draftId ? "Draft ready" : doc.sourceStatus === "waived" ? "Waived" : doc.sourceStatus === "signed" ? "Signed" : doc.status === "ready" ? "Received" : doc.status === "missing" ? "Missing" : "Requested"}</span>{doc.draftId && doc.draftVisibility ? <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", doc.draftVisibility === "client" ? "bg-[#f2e2d8] text-[#a24f31]" : "bg-slate-100 text-slate-600")}>{doc.draftVisibility === "client" ? "Client-visible" : "Internal"}</span> : null}{doc.templateKey && doc.id && appointment.matterId ? <Button size="sm" variant="outline" disabled={Boolean(savingKey)} onClick={() => doc.draftId ? setDraftEditor({ draftId: doc.draftId!, documentId: doc.id!, name: doc.label, content: doc.draftContent ?? "", status: doc.draftStatus ?? "draft", visibility: doc.draftVisibility ?? "internal", versions: doc.versions ?? [] }) : createDraft(doc)} className="shrink-0 border-[#d8c1b4] bg-[#fffaf6] px-2 text-[11px] text-[#a24f31]">{savingKey === `draft-${doc.id}` ? "Preparing…" : doc.draftId ? "Open draft" : "Create draft"}</Button> : null}{doc.id && appointment.matterId ? <Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => runAction(`document-${doc.id}`, () => updateAppointmentDocumentAction({ matterId: appointment.matterId, documentId: doc.id!, status: doc.sourceStatus === "requested" ? "received" : doc.sourceStatus === "signed" ? "requested" : "requested" }))} className="shrink-0 px-2 text-[11px] text-[#b65f3a]">{savingKey === `document-${doc.id}` ? "Saving…" : doc.sourceStatus === "requested" ? "Mark received" : "Reopen"}</Button> : null}{doc.id && appointment.matterId && doc.sourceStatus === "requested" ? <Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => runAction(`waive-${doc.id}`, () => updateAppointmentDocumentAction({ matterId: appointment.matterId, documentId: doc.id!, status: "waived" }))} className="shrink-0 px-2 text-[11px] text-[#737872]">Waive</Button> : null}</div>)}</div></section> : null}
          {!appointment.isNote && participants.length ? <section><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Participants</h3><div className="mt-3 space-y-2">{participants.map((participant) => <div key={participant.id} className="flex items-center gap-3 rounded-lg border border-[#e8e3da] bg-white px-3 py-2.5 text-sm"><span className="min-w-0 flex-1 truncate text-[#39443f]">{participant.displayName}{participant.isRequired ? <span className="ml-1 text-[10px] text-[#9b9d97]">required</span> : null}</span><span className={cn("text-[11px] font-semibold", participant.responseStatus === "confirmed" ? "text-emerald-700" : participant.responseStatus === "declined" ? "text-rose-700" : "text-amber-700")}>{participant.responseStatus === "confirmed" ? "Confirmed" : participant.responseStatus === "declined" ? "Declined" : "Pending"}</span><Button size="sm" variant="ghost" disabled={Boolean(savingKey)} onClick={() => runAction(`participant-${participant.id}`, () => updateAppointmentParticipantAction({ matterId: appointment.matterId, participantId: participant.id, responseStatus: participant.responseStatus === "confirmed" ? "pending" : "confirmed" }))} className="shrink-0 px-2 text-[11px] text-[#b65f3a]">{savingKey === `participant-${participant.id}` ? "Saving…" : participant.responseStatus === "confirmed" ? "Reopen" : "Confirm"}</Button></div>)}</div></section> : null}
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
          <section><div className="flex items-center justify-between gap-3"><div><h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Client communication</h3><p className="mt-1 text-xs text-[#737872]">A single record of every message prepared for this appointment.</p></div><span className="rounded-full bg-[#f1eee8] px-2 py-1 text-[10px] font-bold text-[#737872]">{appointment.communications?.length ?? 0} messages</span></div><div className="mt-3 space-y-2">{appointment.communications?.length ? appointment.communications.slice(0, 4).map((communication) => <div key={communication.id} className="rounded-lg border border-[#e8e3da] bg-white px-3 py-2.5"><div className="flex items-center gap-2"><Mail className="size-3.5 text-[#b65f3a]" /><span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#39443f]">{communication.subject || "Untitled email"}</span><span className={cn("text-[10px] font-bold", communication.status === "sent" ? "text-emerald-700" : communication.status === "failed" ? "text-rose-700" : communication.status === "queued" ? "text-amber-700" : "text-[#8b8d88]")}>{communication.status === "queued" ? "Queued" : communication.status === "sent" ? "Sent" : communication.status === "failed" ? "Failed" : communication.status === "cancelled" ? "Cancelled" : "Draft"}</span></div><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#737872]">{communication.body.replace(/\s+/g, " ").trim()}</p><p className="mt-1 text-[10px] text-[#a1a39d]">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(communication.createdAt))}{communication.recipient ? ` · ${communication.recipient}` : ""}</p></div>) : <div className="rounded-lg border border-dashed border-[#d9d3c9] bg-[#fbfaf7] px-3 py-3 text-xs leading-5 text-[#8b8d88]">No messages yet. Start with a prepared follow-up or client packet note.</div>}</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setEmailComposer(true)} className="flex items-center justify-center gap-2 rounded-lg border border-[#e1dbd1] bg-white px-3 py-2.5 text-xs font-semibold text-[#4d5851] hover:border-[#b65f3a]"><Mail className="size-3.5" /> Email client</button><button type="button" disabled className="flex items-center justify-center gap-2 rounded-lg border border-[#e8e3da] bg-[#f1eee8] px-3 py-2.5 text-xs font-semibold text-[#a1a39d]"><MessageSquareText className="size-3.5" /> Text later</button></div><p className="mt-2 text-xs text-[#8b8d88]">Email messages can be saved as drafts or queued for provider delivery. SMS is planned next.</p></section>
          <div className="flex items-center gap-2 border-t border-[#e8e3da] pt-4"><Button variant="outline" className="flex-1" onClick={onClose}>Close panel</Button><Button className="flex-1 bg-[#23313d] hover:bg-[#18242e]" onClick={appointment.isNote ? onClose : undefined}>{appointment.isNote ? "Close note" : "Open matter"} <ArrowUpRight /></Button></div>
        </div>
      </div>
      {draftEditor ? <DocumentDraftEditor documentName={draftEditor.name} content={draftEditor.content} status={draftEditor.status} visibility={draftEditor.visibility} versions={draftEditor.versions} saving={savingKey.startsWith("draft-")} onChange={(content) => setDraftEditor((current) => current ? { ...current, content } : current)} onClose={() => setDraftEditor(null)} onApprove={approveDraft} onReopen={reopenDraft} onSave={saveDraft} onToggleVisibility={toggleDraftVisibility} onRestoreVersion={restoreDraftVersion} /> : null}
      {emailComposer ? <AppointmentEmailComposer appointment={appointment} onClose={() => setEmailComposer(false)} onSaved={() => { setEmailComposer(false); onUpdated() }} /> : null}
    </div>
  )
}

function CommunicationCenter({ communications, emailDeliveryConfigured }: { communications: DashboardCommunication[]; emailDeliveryConfigured: boolean }) {
  const router = useRouter()
  const [savingId, setSavingId] = useState("")
  const [error, setError] = useState("")
  const queuedCount = communications.filter((communication) => communication.status === "queued").length
  const draftCount = communications.filter((communication) => communication.status === "draft").length
  const failedCount = communications.filter((communication) => communication.status === "failed").length
  const sentCount = communications.filter((communication) => communication.status === "sent").length

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
        <div><div className="flex items-center gap-2"><Send className="size-4 text-[#b65f3a]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Communication outbox</h2><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", emailDeliveryConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{emailDeliveryConfigured ? "Resend connected" : "Provider setup needed"}</span></div><p className="mt-1 max-w-xl text-xs leading-5 text-[#8b8d88]">One place to see drafts, queued messages, and delivery issues across your appointments.</p></div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{queuedCount} queued</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{sentCount} sent</span><span className="rounded-full bg-[#f1eee8] px-2.5 py-1 text-[#737872]">{draftCount} drafts</span>{failedCount ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">{failedCount} failed</span> : null}</div>
      </div>
      <div className="p-5 sm:p-6">
        <div className={cn("mb-4 flex items-start gap-3 rounded-xl border p-3 text-xs leading-5", emailDeliveryConfigured ? "border-emerald-200 bg-emerald-50/70 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900")}><span className="mt-0.5 shrink-0">{emailDeliveryConfigured ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4 text-amber-600" />}</span><span><strong>{emailDeliveryConfigured ? "Resend is connected." : "Email delivery needs configuration."}</strong>{" "}{emailDeliveryConfigured ? "Queued emails are processed by MatterPilot’s scheduled delivery worker, and sent messages remain visible here." : "Queueing is safe and durable, but messages will wait until a provider is connected."}</span></div>
        {error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
        {communications.length ? <div className="space-y-2">{communications.map((communication) => <div key={communication.id} className="grid gap-3 rounded-xl border border-[#e8e3da] bg-white p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.8fr)_auto] lg:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><Mail className="size-4 shrink-0 text-[#b65f3a]" /><p className="truncate text-sm font-semibold text-[#39443f]">{communication.subject || "Untitled email"}</p><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", communication.status === "sent" ? "bg-emerald-50 text-emerald-700" : communication.status === "failed" ? "bg-rose-50 text-rose-700" : communication.status === "queued" ? "bg-amber-50 text-amber-800" : communication.status === "cancelled" ? "bg-slate-100 text-slate-600" : "bg-[#f1eee8] text-[#737872]")}>{communication.status === "queued" ? "Queued" : communication.status === "sent" ? "Sent" : communication.status === "failed" ? "Failed" : communication.status === "cancelled" ? "Cancelled" : "Draft"}</span></div><p className="mt-1 line-clamp-1 text-xs text-[#737872]">{communication.body.replace(/\s+/g, " ").trim()}</p>{communication.status === "sent" && communication.sentAt ? <p className="mt-2 text-[10px] font-semibold text-emerald-700">Sent {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(communication.sentAt))}{communication.provider ? ` via ${communication.provider}` : ""}</p> : null}{communication.status === "failed" && communication.errorMessage ? <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] leading-5 text-rose-700"><strong>Delivery issue:</strong> {communication.errorMessage}{communication.attemptCount > 0 ? ` · Attempt ${communication.attemptCount}` : ""}</p> : null}</div><div className="min-w-0 text-xs text-[#737872]"><p className="truncate font-semibold text-[#4d5851]">{communication.client} · {communication.appointment}</p><p className="mt-1 truncate">{communication.recipient || "No recipient yet"} · {communication.matter}</p>{communication.status === "queued" ? <p className="mt-1 text-[10px] text-amber-700">Waiting for the scheduled delivery worker</p> : null}</div><div className="flex items-center justify-end gap-2">{communication.status === "draft" ? <Button size="sm" variant="outline" disabled={savingId === communication.id} onClick={() => update(communication, "queue")} className="border-[#d8c1b4] bg-[#fffaf6] px-2.5 text-[11px] text-[#a24f31]">{savingId === communication.id ? "Saving…" : "Queue"}</Button> : null}{communication.status === "failed" || communication.status === "cancelled" ? <Button size="sm" variant="outline" disabled={savingId === communication.id} onClick={() => update(communication, "retry")} className="border-[#d8c1b4] bg-[#fffaf6] px-2.5 text-[11px] text-[#a24f31]">{savingId === communication.id ? "Retrying…" : "Retry"}</Button> : null}{communication.status === "draft" || communication.status === "queued" ? <Button size="sm" variant="ghost" disabled={savingId === communication.id} onClick={() => update(communication, "cancel")} className="px-2.5 text-[11px] text-[#737872]">Cancel</Button> : null}</div></div>)}</div> : <div className="rounded-xl border border-dashed border-[#d9d3c9] bg-[#fbfaf7] px-5 py-8 text-center"><Send className="mx-auto size-6 text-[#c8b6a8]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">Your outbox is clear.</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#8b8d88]">Open any appointment, choose Email client, and save a draft or queue a prepared message here.</p></div>}
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

  return <section id="contacts" className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="flex flex-col gap-4 border-b border-[#e8e3da] px-5 py-5 sm:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><ContactRound className="size-4 text-[#b65f3a]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Client & contact command center</h2><span className="rounded-full bg-[#f1eee8] px-2 py-0.5 text-[10px] font-bold text-[#777b76]">Matter-aware</span></div><p className="mt-1 max-w-xl text-xs leading-5 text-[#8b8d88]">A clean view of the people who shape the work—clients, witnesses, experts, and opposing counsel.</p></div><Button size="sm" onClick={() => setShowComposer(true)} className="bg-[#b65f3a] hover:bg-[#9f5030]"><Plus /> Add contact</Button></div><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-center"><div className="flex items-center gap-2 rounded-lg border border-[#ded9d0] bg-white px-3 py-2"><Search className="size-3.5 text-[#9b9d97]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people or matters" className="w-full bg-transparent text-xs text-[#39443f] outline-none placeholder:text-[#a1a39d]" /></div><select value={filter} onChange={(event) => setFilter(event.target.value as "all" | DashboardContact["role"])} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-xs text-[#39443f] outline-none focus:border-[#b65f3a]"><option value="all">All roles</option><option value="client">Clients</option><option value="prospective_client">Prospective clients</option><option value="witness">Witnesses</option><option value="expert">Experts</option><option value="opposing_counsel">Opposing counsel</option><option value="other">Other</option></select><div className="flex gap-2 text-[11px] font-semibold"><span className="rounded-full bg-[#e8eef0] px-2.5 py-1 text-[#385367]">{activeContacts.length} active</span><span className="rounded-full bg-[#f1eee8] px-2.5 py-1 text-[#737872]">{contacts.length - activeContacts.length} archived</span></div></div></div><div className="p-5 sm:p-6">{error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}{filteredContacts.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredContacts.map((contact) => <article key={contact.id} className={cn("rounded-xl border bg-white p-4", contact.status === "archived" ? "border-[#e8e3da] opacity-65" : "border-[#e2d7cd]")}><div className="flex items-start gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold", contact.role === "client" ? "bg-[#f4e5db] text-[#955033]" : "bg-[#e8eef0] text-[#385367]")}><ContactRound className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#39443f]">{contact.name}</p><p className="mt-0.5 truncate text-[11px] text-[#8b8d88]">{roleLabel(contact.role)} · {contact.matter}</p></div></div>{contact.duplicateMatterNames.length ? <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-semibold leading-4 text-amber-800">Possible duplicate across: {contact.duplicateMatterNames.join(", ")}</p> : null}<div className="mt-4 space-y-1 text-xs text-[#626b64]">{contact.email ? <a href={`mailto:${contact.email}`} className="block truncate text-[#a24f31] hover:underline">{contact.email}</a> : <p className="text-[#a1a39d]">No email recorded</p>}{contact.phone ? <a href={`tel:${contact.phone}`} className="block text-[#626b64]">{contact.phone}</a> : null}</div>{contact.notes ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#737872]">{contact.notes}</p> : null}<div className="mt-4 flex items-center justify-between border-t border-[#eee9e2] pt-3 text-[10px] text-[#8b8d88]"><span>{contact.appointmentCount} appointments · {contact.openDeadlineCount} open deadlines</span><Button size="sm" variant="ghost" disabled={savingId === contact.id} onClick={() => toggle(contact)} className="px-1.5 text-[10px] text-[#b65f3a]">{savingId === contact.id ? "Saving…" : contact.status === "active" ? "Archive" : "Reactivate"}</Button></div></article>)}</div> : <div className="rounded-xl border border-dashed border-[#d9d3c9] bg-[#fbfaf7] px-5 py-8 text-center"><ContactRound className="mx-auto size-6 text-[#c8b6a8]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">No contacts match this view.</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#8b8d88]">Add a client, witness, expert, or opposing counsel to give every matter a human context.</p></div>}</div>{showComposer ? <ContactComposer matters={matters} onClose={() => setShowComposer(false)} onSaved={() => { setShowComposer(false); router.refresh() }} /> : null}</section>
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

function PortalMessageInbox({ messages }: { messages: DashboardPortalMessage[] }) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState("")
  const [error, setError] = useState("")
  const grouped = messages.reduce<Record<string, DashboardPortalMessage[]>>((result, message) => { (result[message.matterId] ??= []).push(message); return result }, {})

  async function reply(matterId: string) {
    const body = drafts[matterId]?.trim() ?? ""
    if (!body) return
    setSending(matterId)
    setError("")
    const result = await sendFirmPortalMessageAction({ matterId, body })
    setSending("")
    if (!result.ok) { setError(result.error); return }
    setDrafts((current) => ({ ...current, [matterId]: "" }))
    router.refresh()
  }

  return <section id="portal-messages" className="rounded-2xl border border-[#c8d8dc] bg-[#f7fbfc] shadow-sm"><div className="border-b border-[#dce8ea] px-5 py-5 sm:px-6"><div className="flex items-center gap-2"><MessageSquareText className="size-4 text-[#385367]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Client portal messages</h2><span className="rounded-full bg-[#e8eef0] px-2 py-0.5 text-[10px] font-bold text-[#385367]">Matter-scoped</span></div><p className="mt-1 text-xs leading-5 text-[#63747a]">Reply to verified clients from the same workspace. Messages stay attached to the matter and are included in the activity trail.</p></div><div className="space-y-4 p-5 sm:p-6">{error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}{Object.keys(grouped).length ? Object.entries(grouped).map(([matterId, matterMessages]) => <article key={matterId} className="rounded-xl border border-[#dce8ea] bg-white p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#39443f]">{matterMessages[0].matter}</p><p className="mt-0.5 text-[11px] text-[#8b8d88]">{matterMessages[matterMessages.length - 1].senderEmail}</p></div><span className="rounded-full bg-[#f1f7f8] px-2 py-1 text-[10px] font-bold text-[#385367]">{matterMessages.length} messages</span></div><div className="mt-3 space-y-2">{matterMessages.slice(-5).map((message) => <div key={message.id} className={cn("rounded-lg px-3 py-2.5 text-xs leading-5", message.senderRole === "client" ? "bg-[#fffaf6] text-[#4d5751]" : "ml-6 bg-[#e8eef0] text-[#385367]")}><p>{message.body}</p><p className="mt-1 text-[10px] opacity-60">{message.senderRole === "client" ? "Client" : "Firm"} · {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</p></div>)}</div><div className="mt-3 flex gap-2"><textarea value={drafts[matterId] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [matterId]: event.target.value }))} placeholder="Reply to the client…" className="min-h-11 flex-1 rounded-lg border border-[#c8d8dc] bg-white px-3 py-2 text-xs outline-none focus:border-[#385367]" /><Button size="sm" onClick={() => void reply(matterId)} disabled={sending === matterId || !(drafts[matterId] ?? "").trim()} className="self-end bg-[#385367] hover:bg-[#294351]">{sending === matterId ? "Sending…" : "Reply"}<Send /></Button></div></article>) : <div className="rounded-xl border border-dashed border-[#c8d8dc] bg-white/70 px-5 py-8 text-center"><MessageSquareText className="mx-auto size-6 text-[#9bb2ba]" /><p className="mt-3 text-sm font-semibold text-[#4d5751]">No client messages yet.</p><p className="mt-1 text-xs text-[#63747a]">Verified portal conversations will appear here when clients write in.</p></div>}</div></section>
}

function PortalDocumentRequestCenter({ matters, requests }: { matters: Matter[]; requests: DashboardPortalDocumentRequest[] }) {
  const router = useRouter()
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState("")
  const [error, setError] = useState("")

  async function createRequest() {
    if (!matterId || !title.trim()) return
    setSaving("create")
    setError("")
    const result = await createClientPortalDocumentRequestAction({ matterId, title, description })
    setSaving("")
    if (!result.ok) { setError(result.error); return }
    setTitle("")
    setDescription("")
    router.refresh()
  }

  async function review(request: DashboardPortalDocumentRequest, status: "approved" | "rejected") {
    setSaving(`${status}-${request.id}`)
    setError("")
    const result = await reviewClientPortalDocumentAction({ matterId: request.matterId, requestId: request.id, status })
    setSaving("")
    if (!result.ok) { setError(result.error); return }
    router.refresh()
  }

  async function download(request: DashboardPortalDocumentRequest) {
    setSaving(`download-${request.id}`)
    setError("")
    const result = await createClientPortalDocumentDownloadUrlAction(request.id)
    setSaving("")
    if (!result.ok) { setError(result.error); return }
    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  const statusClass = (status: DashboardPortalDocumentRequest["status"]) => status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "uploaded" ? "bg-sky-50 text-sky-700" : status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"

  return <section id="portal-documents" className="rounded-2xl border border-[#d8c7bb] bg-[#fffaf6] shadow-sm"><div className="border-b border-[#eadbd0] px-5 py-5 sm:px-6"><div className="flex items-center gap-2"><FileText className="size-4 text-[#a24f31]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Client document requests</h2><span className="rounded-full bg-[#f2e2d8] px-2 py-0.5 text-[10px] font-bold text-[#8b604c]">Portal workflow</span></div><p className="mt-1 max-w-2xl text-xs leading-5 text-[#8b6f60]">Ask a client for a file, review what they upload, and keep the request attached to the matter. Uploads remain private until a team member approves them.</p></div><div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[340px_minmax(0,1fr)]"><div className="rounded-xl border border-[#eadbd0] bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b604c]">New request</p><label className="mt-4 block text-[11px] font-semibold text-[#6c716c]">Matter<select value={matterId} onChange={(event) => setMatterId(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#ded9d0] bg-white px-2 text-xs font-normal text-[#39443f]"><option value="">Select a matter</option>{matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.name}</option>)}</select></label><label className="mt-3 block text-[11px] font-semibold text-[#6c716c]">What do you need?<Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Photo ID, police report, lease…" className="mt-1 h-9 border-[#ded9d0] text-xs font-normal" /></label><label className="mt-3 block text-[11px] font-semibold text-[#6c716c]">Instructions <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context or file requirements" className="mt-1 min-h-20 w-full rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-xs font-normal outline-none focus:border-[#a24f31]" /></label>{error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}<Button size="sm" onClick={() => void createRequest()} disabled={saving === "create" || !matterId || !title.trim()} className="mt-3 w-full bg-[#a24f31] hover:bg-[#8f432a]">{saving === "create" ? "Creating…" : "Create request"}<Plus /></Button></div><div className="space-y-3">{requests.length ? requests.map((request) => <article key={request.id} className="rounded-xl border border-[#eadbd0] bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#39443f]">{request.title}</p><p className="mt-0.5 text-[11px] text-[#8b8d88]">{request.matter}{request.description ? ` · ${request.description}` : ""}</p></div><span className={cn("rounded-full px-2 py-1 text-[10px] font-bold capitalize", statusClass(request.status))}>{request.status}</span></div>{request.fileName ? <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#fffaf6] px-3 py-2 text-xs"><FileText className="size-3.5 text-[#a24f31]" /><span className="min-w-0 flex-1 truncate font-semibold text-[#4d5851]">{request.fileName}</span>{request.sizeBytes ? <span className="text-[10px] text-[#8b8d88]">{Math.max(1, Math.round(request.sizeBytes / 1024))} KB</span> : null}<Button size="sm" variant="ghost" onClick={() => void download(request)} disabled={saving === `download-${request.id}`} className="h-7 px-2 text-[11px] text-[#a24f31]">{saving === `download-${request.id}` ? "…" : "Review file"}</Button></div> : <p className="mt-3 rounded-lg bg-[#fbfaf7] px-3 py-2 text-xs text-[#8b8d88]">Waiting for the client to upload this document.</p>}{request.reviewerNote ? <p className="mt-2 text-[11px] text-[#8b604c]">Note: {request.reviewerNote}</p> : null}{request.status === "uploaded" ? <div className="mt-3 flex flex-wrap gap-2 border-t border-[#f0e5dd] pt-3"><Button size="sm" onClick={() => void review(request, "approved")} disabled={Boolean(saving)} className="bg-[#385367] hover:bg-[#294351]">Approve upload <Check /></Button><Button size="sm" variant="outline" onClick={() => void review(request, "rejected")} disabled={Boolean(saving)} className="border-[#d8c7bb] text-[#a24f31]">Request replacement</Button></div> : null}</article>) : <div className="rounded-xl border border-dashed border-[#d9c5b7] bg-white/70 px-5 py-10 text-center"><FileText className="mx-auto size-6 text-[#c8a897]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">No document requests yet.</p><p className="mt-1 text-xs text-[#8b8d88]">Create a request and it will appear in the client portal immediately.</p></div>}</div></div></section>
}

function TeamTaskCenter({ tasks, members }: { tasks: DashboardTask[]; members: DashboardMember[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | "unassigned" | "overdue">("all")
  const [saving, setSaving] = useState("")
  const [error, setError] = useState("")
  const [dependencyChoice, setDependencyChoice] = useState<Record<string, string>>({})
  const [now] = useState(() => Date.now())
  const filtered = tasks.filter((task) => filter === "unassigned" ? !task.assignedTo : filter === "overdue" ? task.status === "open" && task.dueAt && new Date(task.dueAt).getTime() < now : true)
  const openTasks = tasks.filter((task) => task.status === "open")
  const overdueCount = openTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < now).length
  const ownerCounts = members.map((member) => ({ ...member, count: openTasks.filter((task) => task.assignedTo === member.userId).length })).filter((member) => member.count > 0).sort((a, b) => b.count - a.count)

  async function updateTask(task: DashboardTask, input: { status?: DashboardTask["status"]; assignedTo?: string; dueAt?: string }) {
    setSaving(task.id)
    setError("")
    const result = await updateAppointmentTaskAction({ matterId: task.matterId, taskId: task.id, status: input.status ?? task.status, assignedTo: input.assignedTo ?? task.assignedTo ?? "", dueAt: input.dueAt ?? (task.dueAt ?? "") })
    setSaving("")
    if (!result.ok) { setError(result.error); return }
    router.refresh()
  }

  async function addDependency(task: DashboardTask) {
    const dependsOnTaskId = dependencyChoice[task.id]
    if (!dependsOnTaskId) return
    setSaving(`dependency-${task.id}`)
    setError("")
    const result = await createAppointmentTaskDependencyAction({ matterId: task.matterId, taskId: task.id, dependsOnTaskId })
    setSaving("")
    if (!result.ok) { setError(result.error); return }
    setDependencyChoice((current) => ({ ...current, [task.id]: "" }))
    router.refresh()
  }

  return <section id="workload" className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="flex flex-col gap-4 border-b border-[#e8e3da] px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-[#a24f31]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Team workload & task planning</h2><span className="rounded-full bg-[#f1eee8] px-2 py-0.5 text-[10px] font-bold text-[#777b76]">Owners + dependencies</span></div><p className="mt-1 max-w-2xl text-xs leading-5 text-[#8b8d88]">Assign preparation work, set due dates, and make dependencies visible before a blocked appointment becomes a surprise.</p></div><div className="flex flex-wrap gap-2 text-[11px] font-semibold"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{openTasks.length} open</span><span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">{overdueCount} overdue</span><span className="rounded-full bg-[#e8eef0] px-2.5 py-1 text-[#385367]">{members.length} team members</span></div></div><div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_280px]"><div><div className="mb-4 flex flex-wrap gap-2"><Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className={filter === "all" ? "bg-[#23313d] hover:bg-[#18242e]" : "border-[#ded9d0]"}>All tasks</Button><Button size="sm" variant={filter === "unassigned" ? "default" : "outline"} onClick={() => setFilter("unassigned")} className={filter === "unassigned" ? "bg-[#a24f31] hover:bg-[#8f432a]" : "border-[#ded9d0]"}>Unassigned</Button><Button size="sm" variant={filter === "overdue" ? "default" : "outline"} onClick={() => setFilter("overdue")} className={filter === "overdue" ? "bg-rose-700 hover:bg-rose-800" : "border-[#ded9d0]"}>Overdue</Button></div>{error ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}{filtered.length ? <div className="space-y-2">{filtered.slice(0, 24).map((task) => { const dependencyOptions = tasks.filter((candidate) => candidate.appointmentId === task.appointmentId && candidate.id !== task.id && !task.dependencies.some((dependency) => dependency.dependsOnTaskId === candidate.id)); const overdue = task.status === "open" && task.dueAt && new Date(task.dueAt).getTime() < now; return <article key={task.id} className="rounded-xl border border-[#e8e3da] bg-white p-3.5"><div className="flex flex-col gap-3 lg:flex-row lg:items-start"><button type="button" onClick={() => void updateTask(task, { status: task.status === "done" ? "open" : "done" })} className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border", task.status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#cfc8bd] bg-white text-transparent hover:border-[#a24f31]")} aria-label={task.status === "done" ? `Reopen ${task.label}` : `Complete ${task.label}`}><Check className="size-3.5" /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className={cn("text-sm font-semibold", task.status === "done" ? "text-[#8b8d88] line-through" : "text-[#39443f]")}>{task.label}</p>{task.isBlocking ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Blocking</span> : null}{overdue ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Overdue</span> : null}</div><p className="mt-1 text-[11px] text-[#8b8d88]">{task.matter} · {task.appointment}</p>{task.dependencies.length ? <div className="mt-2 flex flex-wrap gap-1.5">{task.dependencies.map((dependency) => <span key={dependency.id} className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", dependency.dependsOnStatus === "done" || dependency.dependsOnStatus === "waived" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>Depends on: {dependency.dependsOnLabel}</span>)}</div> : null}<div className="mt-3 flex flex-wrap items-center gap-2"><select value={task.assignedTo ?? ""} onChange={(event) => void updateTask(task, { assignedTo: event.target.value })} disabled={saving === task.id} className="h-8 max-w-[180px] rounded-lg border border-[#ded9d0] bg-white px-2 text-[11px] text-[#4d5851]"><option value="">Unassigned</option>{members.filter((member) => member.userId === task.assignedTo || member.userId).map((member) => <option key={`${task.id}-${member.userId}`} value={member.userId}>{member.name} · {member.role}</option>)}</select><label className="flex items-center gap-1.5 text-[11px] text-[#8b8d88]">Due <input type="date" value={task.dueAt ? task.dueAt.slice(0, 10) : ""} onChange={(event) => void updateTask(task, { dueAt: event.target.value ? new Date(`${event.target.value}T17:00:00`).toISOString() : "" })} disabled={saving === task.id} className="h-8 rounded-lg border border-[#ded9d0] bg-white px-2 text-[11px] text-[#4d5851]" /></label>{dependencyOptions.length ? <><select value={dependencyChoice[task.id] ?? ""} onChange={(event) => setDependencyChoice((current) => ({ ...current, [task.id]: event.target.value }))} className="h-8 max-w-[190px] rounded-lg border border-[#ded9d0] bg-white px-2 text-[11px] text-[#4d5851]"><option value="">Add dependency…</option>{dependencyOptions.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select><Button size="sm" variant="outline" onClick={() => void addDependency(task)} disabled={saving === `dependency-${task.id}` || !dependencyChoice[task.id]} className="h-8 border-[#ded9d0] px-2 text-[11px]">{saving === `dependency-${task.id}` ? "…" : "Link"}</Button></> : null}</div></div></div></article>})}</div> : <div className="rounded-xl border border-dashed border-[#d9d3c9] bg-white/70 px-5 py-8 text-center"><ClipboardCheck className="mx-auto size-6 text-[#c8b6a8]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">No tasks match this view.</p><p className="mt-1 text-xs text-[#8b8d88]">Assign work from an appointment workflow or switch the filter.</p></div>}{filtered.length > 24 ? <p className="mt-3 text-center text-[11px] text-[#8b8d88]">Showing the first 24 tasks. Use filters to narrow the workload.</p> : null}</div><aside className="rounded-xl border border-[#e8e3da] bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b604c]">Open work by owner</p><div className="mt-4 space-y-3">{ownerCounts.length ? ownerCounts.map((member) => <div key={member.userId}><div className="flex items-center justify-between gap-2 text-xs"><span className="truncate font-semibold text-[#4d5851]">{member.name}</span><span className="font-bold text-[#a24f31]">{member.count}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f1eee8]"><div className="h-full rounded-full bg-[#a24f31]" style={{ width: `${Math.min(100, member.count / Math.max(1, openTasks.length) * 100)}%` }} /></div></div>) : <p className="text-xs leading-5 text-[#8b8d88]">No assigned open tasks yet.</p>}{openTasks.filter((task) => !task.assignedTo).length ? <div className="border-t border-[#eee5dc] pt-3 text-xs text-[#a24f31]"><strong>{openTasks.filter((task) => !task.assignedTo).length}</strong> open tasks still need an owner.</div> : null}</div></aside></div></section>
}

type DraftAvailabilityRule = { weekday: number; startTime: string; endTime: string; timezone: string }

const availabilityDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function defaultAvailabilityRules(): DraftAvailabilityRule[] {
  return availabilityDays.slice(0, 5).map((_, index) => ({ weekday: index + 1, startTime: "09:00", endTime: "17:00", timezone: "America/Chicago" }))
}

function AvailabilityCenter({ matters, rules, blackouts }: { matters: Matter[]; rules: DashboardAvailabilityRule[]; blackouts: DashboardBlackout[] }) {
  const router = useRouter()
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "")
  const [draftRulesByMatter, setDraftRulesByMatter] = useState<Record<string, DraftAvailabilityRule[]>>({})
  const [saving, setSaving] = useState("")
  const [error, setError] = useState("")
  const [blackoutDate, setBlackoutDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [blackoutStart, setBlackoutStart] = useState("12:00")
  const [blackoutEnd, setBlackoutEnd] = useState("13:00")
  const [blackoutReason, setBlackoutReason] = useState("Personal block")

  const savedRules = rules.filter((rule) => rule.matterId === matterId)
  const draftRules = draftRulesByMatter[matterId] ?? (savedRules.length ? savedRules.map((rule) => ({ weekday: rule.weekday, startTime: rule.startTime, endTime: rule.endTime, timezone: rule.timezone })) : defaultAvailabilityRules())

  function setDraftRules(update: DraftAvailabilityRule[] | ((current: DraftAvailabilityRule[]) => DraftAvailabilityRule[])) {
    setDraftRulesByMatter((current) => ({ ...current, [matterId]: typeof update === "function" ? update(draftRules) : update }))
  }

  const matterBlackouts = blackouts.filter((blackout) => blackout.matterId === matterId)

  function toggleDay(weekday: number) {
    setDraftRules((current) => current.some((rule) => rule.weekday === weekday) ? current.filter((rule) => rule.weekday !== weekday) : [...current, { weekday, startTime: "09:00", endTime: "17:00", timezone: "America/Chicago" }].sort((a, b) => a.weekday - b.weekday))
  }

  function updateRule(weekday: number, field: "startTime" | "endTime" | "timezone", value: string) {
    setDraftRules((current) => current.map((rule) => rule.weekday === weekday ? { ...rule, [field]: value } : rule))
  }

  async function saveRules() {
    if (!matterId) return
    setSaving("rules")
    setError("")
    const result = await saveCalendarAvailabilityAction({ matterId, rules: draftRules })
    setSaving("")
    if (!result.ok) { setError(result.error); return }
    router.refresh()
  }

  async function addBlackout() {
    if (!matterId) return
    setSaving("blackout")
    setError("")
    const result = await createCalendarBlackoutAction({ matterId, startsAt: new Date(`${blackoutDate}T${blackoutStart}:00`).toISOString(), endsAt: new Date(`${blackoutDate}T${blackoutEnd}:00`).toISOString(), reason: blackoutReason })
    setSaving("")
    if (!result.ok) { setError(result.error); return }
    router.refresh()
  }

  async function cancelBlackout(blackoutId: string) {
    setSaving(blackoutId)
    setError("")
    const result = await cancelCalendarBlackoutAction({ matterId, blackoutId })
    setSaving("")
    if (!result.ok) { setError(result.error); return }
    router.refresh()
  }

  return <section id="availability" className="rounded-2xl border border-[#d5c8b9] bg-[#fffaf6] shadow-sm"><div className="flex flex-col gap-4 border-b border-[#eadbd0] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><Clock3 className="size-4 text-[#a24f31]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Availability & blocked time</h2><span className="rounded-full bg-[#f2e2d8] px-2 py-0.5 text-[10px] font-bold text-[#8b604c]">Booking rules</span></div><p className="mt-1 max-w-xl text-xs leading-5 text-[#8b6f60]">Set the hours public booking can offer. MatterPilot rejects overlaps and blocked windows before creating a request or hold.</p></div>{matters.length ? <select value={matterId} onChange={(event) => setMatterId(event.target.value)} className="h-10 rounded-lg border border-[#d8c7bb] bg-white px-3 text-xs font-semibold text-[#4d5851] outline-none focus:border-[#a24f31]">{matters.map((matter) => <option key={matter.id} value={matter.id}>{matter.name}</option>)}</select> : null}</div><div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div><div className="space-y-2">{availabilityDays.map((day, index) => { const rule = draftRules.find((item) => item.weekday === index + 1); return <div key={day} className={cn("grid items-center gap-2 rounded-xl border p-3 sm:grid-cols-[130px_1fr_1fr_150px]", rule ? "border-[#eadbd0] bg-white" : "border-[#eee5dc] bg-[#fbfaf7]")}><label className="flex items-center gap-2 text-xs font-semibold text-[#4d5851]"><input type="checkbox" checked={Boolean(rule)} onChange={() => toggleDay(index + 1)} className="size-4 accent-[#a24f31]" />{day}</label>{rule ? <><label className="text-[11px] text-[#8b8d88]">From<input type="time" value={rule.startTime} onChange={(event) => updateRule(index + 1, "startTime", event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#ded9d0] bg-white px-2 text-xs text-[#39443f]" /></label><label className="text-[11px] text-[#8b8d88]">To<input type="time" value={rule.endTime} onChange={(event) => updateRule(index + 1, "endTime", event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#ded9d0] bg-white px-2 text-xs text-[#39443f]" /></label><select value={rule.timezone} onChange={(event) => updateRule(index + 1, "timezone", event.target.value)} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-2 text-xs text-[#39443f] sm:mt-4"><option value="America/Chicago">Central</option><option value="America/New_York">Eastern</option><option value="America/Denver">Mountain</option><option value="America/Los_Angeles">Pacific</option></select></> : <span className="text-xs text-[#aaa9a3] sm:col-span-3">Unavailable for booking</span>}</div> })}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-[#8b8d88]">Times are shown to clients in the configured time zone.</p><Button size="sm" onClick={saveRules} disabled={Boolean(saving) || !matterId} className="bg-[#a24f31] hover:bg-[#8f432a]">{saving === "rules" ? "Saving…" : "Save availability"}<Check /></Button></div></div><aside className="rounded-xl border border-[#eadbd0] bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b604c]">Block time</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Use this for court, lunch, travel, or personal time. Existing appointments remain visible and are never silently moved.</p><div className="mt-4 grid grid-cols-2 gap-2"><label className="text-[11px] text-[#8b8d88]">Date<input type="date" value={blackoutDate} onChange={(event) => setBlackoutDate(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#ded9d0] px-2 text-xs" /></label><label className="text-[11px] text-[#8b8d88]">Reason<input value={blackoutReason} onChange={(event) => setBlackoutReason(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#ded9d0] px-2 text-xs" /></label><label className="text-[11px] text-[#8b8d88]">Start<input type="time" value={blackoutStart} onChange={(event) => setBlackoutStart(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#ded9d0] px-2 text-xs" /></label><label className="text-[11px] text-[#8b8d88]">End<input type="time" value={blackoutEnd} onChange={(event) => setBlackoutEnd(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#ded9d0] px-2 text-xs" /></label></div><Button size="sm" onClick={addBlackout} disabled={Boolean(saving) || !matterId || !blackoutReason.trim()} className="mt-3 w-full bg-[#23313d] hover:bg-[#18242e]">{saving === "blackout" ? "Blocking…" : "Block time"}</Button>{error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}<div className="mt-5 space-y-2 border-t border-[#eee5dc] pt-4">{matterBlackouts.length ? matterBlackouts.map((blackout) => <div key={blackout.id} className="flex items-center gap-2 rounded-lg bg-[#fbfaf7] p-2.5 text-[11px]"><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[#4d5851]">{blackout.reason}</span><span className="mt-0.5 block text-[#8b8d88]">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(blackout.startsAt))} – {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(blackout.endsAt))}</span></span><button type="button" onClick={() => cancelBlackout(blackout.id)} disabled={Boolean(saving)} className="shrink-0 font-semibold text-[#a24f31] hover:underline">{saving === blackout.id ? "…" : "Remove"}</button></div>) : <p className="text-xs text-[#aaa9a3]">No active blocked windows.</p>}</div></aside></div></section>
}

export function MatterPilotDashboard({ view = "overview", matters, initialAppointments = [], initialCommunications = [], emailDeliveryConfigured = false, initialDeadlines = [], initialContacts = [], initialTasks = [], initialTaskMembers = [], initialAvailabilityRules = [], initialBlackouts = [], initialPortalMessages = [], initialPortalDocumentRequests = [], userName = "Maya" }: { view?: DashboardView; matters: Matter[]; initialAppointments?: Appointment[]; initialCommunications?: DashboardCommunication[]; emailDeliveryConfigured?: boolean; initialDeadlines?: DashboardDeadline[]; initialContacts?: DashboardContact[]; initialTasks?: DashboardTask[]; initialTaskMembers?: DashboardMember[]; initialAvailabilityRules?: DashboardAvailabilityRule[]; initialBlackouts?: DashboardBlackout[]; initialPortalMessages?: DashboardPortalMessage[]; initialPortalDocumentRequests?: DashboardPortalDocumentRequest[]; userName?: string }) {
  const [showNew, setShowNew] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | undefined>()
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const router = useRouter()
  const [mobileNav, setMobileNav] = useState(false)
  const [search, setSearch] = useState("")
  const appointments = useMemo(() => initialAppointments, [initialAppointments])
  const filteredAppointments = appointments.filter((appointment) => `${appointment.title} ${appointment.client} ${appointment.matter}`.toLowerCase().includes(search.toLowerCase()))
  const atRisk = appointments.filter((appointment) => appointment.readiness === "at_risk").length
  const blocked = appointments.filter((appointment) => appointment.readiness === "blocked").length
  const ready = appointments.filter((appointment) => appointment.readiness === "ready").length
  const activeNav = view === "overview" ? "Overview" : view[0].toUpperCase() + view.slice(1)
  const todayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())
  const upcomingAppointments = [...filteredAppointments].filter((appointment) => appointment.startAt).sort((a, b) => new Date(a.startAt ?? 0).getTime() - new Date(b.startAt ?? 0).getTime()).slice(0, 4)
  const attentionAppointments = appointments.filter((appointment) => appointment.readiness !== "ready").slice(0, 4)

  function openNewAppointment(slot?: AppointmentSlot) {
    setSelectedSlot(slot)
    setShowNew(true)
  }

  async function moveAppointmentFromCalendar(appointment: Appointment, startsAt: string, endsAt: string): Promise<CalendarMoveResult> {
    const result = await rescheduleAppointmentAction({ matterId: appointment.matterId, appointmentId: appointment.id, startsAt, endsAt, reason: "Moved from calendar view" })
    if (result.ok) router.refresh()
    return result
  }

  const nav = [
    { label: "Overview", icon: LayoutDashboard, href: "/matterpilot" },
    { label: "Calendar", icon: CalendarDays, href: "/matterpilot?view=calendar" },
    { label: "Matters", icon: Gavel, href: "/matters" },
    { label: "Intake", icon: UserRound, href: "/matterpilot/intake", count: 3 },
    { label: "Tasks", icon: ClipboardCheck, href: "/matterpilot?view=tasks", count: initialTasks.filter((task) => task.status === "open").length || undefined },
    { label: "Communications", icon: Send, href: "/matterpilot?view=communications", count: initialCommunications.filter((communication) => communication.status === "queued").length || undefined },
    { label: "Deadlines", icon: CalendarClock, href: "/matterpilot?view=deadlines", count: initialDeadlines.filter((deadline) => deadline.status === "at_risk" || deadline.status === "missed").length || undefined },
    { label: "Contacts", icon: ContactRound, href: "/matterpilot?view=contacts" },
    { label: "Portal", icon: LockKeyhole, href: "/matterpilot?view=portal", count: appointments.filter((appointment) => !appointment.isNote && appointment.documents.some((document) => document.label === "Intake questionnaire" || document.label === "Engagement letter")).length || undefined },
    { label: "Operations", icon: Activity, href: "/matterpilot/operations" },
  ]

  const pageCopy: Record<DashboardView, { eyebrow: string; title: string; description: string }> = {
    overview: { eyebrow: "MatterPilot / Command desk", title: "Your calendar, without the noise.", description: "Appointments stay center stage. Everything else is organized into a workspace tab when you need it." },
    calendar: { eyebrow: "MatterPilot / Calendar", title: "The firm calendar", description: "Move appointments, add notes, and keep the day readable at a glance." },
    tasks: { eyebrow: "MatterPilot / Tasks", title: "Preparation work, in one place.", description: "See what is open, who owns it, and which steps are holding an appointment back." },
    communications: { eyebrow: "MatterPilot / Communications", title: "Client communication", description: "Keep appointment-related email and SMS work together without crowding the command desk." },
    deadlines: { eyebrow: "MatterPilot / Deadlines", title: "Deadlines that stay visible.", description: "Review upcoming, at-risk, missed, and completed deadline work by matter." },
    contacts: { eyebrow: "MatterPilot / Contacts", title: "People across your matters.", description: "Find clients, witnesses, counsel, and other matter contacts without leaving the workspace." },
    portal: { eyebrow: "MatterPilot / Portal", title: "Client portal work", description: "Track packets, document requests, messages, and client access from one focused surface." },
  }

  return (
    <div className="min-h-svh bg-[#f4f1eb] text-[#23313d]">
      <div className="flex min-h-svh">
        <aside className={cn("fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#ded9d0] bg-[#1f303d] text-white transition-transform lg:static lg:translate-x-0", mobileNav ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><Link href="/matterpilot" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#c4724c] shadow-lg shadow-[#c4724c]/20"><Command className="size-4" /></span><span><span className="block font-serif text-lg font-semibold tracking-tight">MatterPilot</span><span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-[#aebbc1]">Legal operations</span></span></Link><button type="button" className="lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X className="size-5" /></button></div>
          <div className="flex-1 overflow-y-auto px-3 py-6"><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a5ae]">Workspace</p><nav className="space-y-1">{nav.map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} onClick={() => setMobileNav(false)} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors", activeNav === item.label ? "bg-white/12 text-white shadow-sm" : "text-[#b8c2c6] hover:bg-white/7 hover:text-white")}><span className="flex items-center gap-3"><Icon className="size-4" />{item.label}</span>{item.count ? <span className="rounded-full bg-[#314552] px-2 py-0.5 text-[10px] font-bold text-[#c8d1d4]">{item.count}</span> : null}</Link> })}</nav><div className="my-7 border-t border-white/10" /><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a5ae]">Tools</p><nav className="space-y-1"><Link href="/matters" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#b8c2c6] transition-colors hover:bg-white/7 hover:text-white"><Sparkles className="size-4" />TraceLine intelligence</Link><Link href="/matterpilot/settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#b8c2c6] transition-colors hover:bg-white/7 hover:text-white"><Settings2 className="size-4" />Settings</Link></nav></div>
          <div className="border-t border-white/10 p-4"><div className="mb-3 flex items-center gap-3 rounded-lg bg-white/7 p-3"><MiniAvatar label={userName.slice(0, 2).toUpperCase()} tone="copper" /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{userName} Chen</span><span className="block text-[10px] text-[#9eafb6]">Attorney · Harbor Legal</span></span><ChevronDown className="ml-auto size-3 text-[#92a2a9]" /></div><SignOutButton /></div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-[#ded9d0] bg-[#fbfaf7]/85 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-[#54615e] hover:bg-[#eeeae3] lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">{todayLabel}</p><h1 className="mt-0.5 font-serif text-xl font-semibold tracking-[-0.02em] text-[#23313d] sm:text-2xl">{view === "overview" ? `Good morning, ${userName}` : pageCopy[view].title}</h1></div></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-xs text-[#8a8d87] md:flex"><Search className="size-3.5" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search matters, people, events" className="w-44 bg-transparent outline-none placeholder:text-[#a1a39d]" /></div><Link href="/matterpilot/operations#notifications" className="inline-flex size-9 items-center justify-center rounded-lg border border-[#ded9d0] bg-white text-[#4d5851] transition-colors hover:bg-[#f4f1eb]" aria-label="Open notifications"><Bell className="size-4" /></Link><Button onClick={() => openNewAppointment()} className="hidden bg-[#b65f3a] shadow-sm shadow-[#b65f3a]/20 hover:bg-[#9f5030] sm:inline-flex"><Plus /> New appointment</Button></div></header>

          <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-7 sm:py-8">
            {view === "overview" ? <>
              <section className="relative overflow-hidden rounded-2xl bg-[#23313d] px-5 py-6 text-white shadow-xl shadow-[#23313d]/10 sm:px-7 sm:py-7"><div className="absolute -right-20 -top-28 size-80 rounded-full border border-white/10" /><div className="absolute -right-8 -top-16 size-56 rounded-full border border-white/10" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5a083]"><span className="size-1.5 rounded-full bg-[#d5a083]" /> MatterPilot command desk</div><h2 className="max-w-2xl font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">Your calendar, <span className="text-[#d5a083]">without the noise.</span></h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#b9c5ca]">Appointments stay center stage. Preparation, deadlines, people, and client work live in their own focused tabs.</p></div><Link href="/matterpilot?view=calendar" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/15">Open full calendar <ArrowUpRight className="size-3.5" /></Link></div></section>

              <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#ded9d0] bg-[#fbfaf7] p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#5c665f]"><span className="size-2 rounded-full bg-emerald-500" /> Ready</span><CheckCircle2 className="size-4 text-emerald-600" /></div><p className="mt-3 text-2xl font-semibold text-[#23313d]">{ready}</p><p className="mt-1 text-xs text-[#8b8d88]">Prepared appointments</p></div><div className="rounded-xl border border-[#ded9d0] bg-[#fbfaf7] p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#5c665f]"><span className="size-2 rounded-full bg-amber-500" /> At risk</span><AlarmClock className="size-4 text-amber-600" /></div><p className="mt-3 text-2xl font-semibold text-[#23313d]">{atRisk}</p><p className="mt-1 text-xs text-[#8b8d88]">Preparation still open</p></div><div className="rounded-xl border border-[#ded9d0] bg-[#fbfaf7] p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#5c665f]"><span className="size-2 rounded-full bg-rose-500" /> Blocked</span><ShieldCheck className="size-4 text-rose-600" /></div><p className="mt-3 text-2xl font-semibold text-[#23313d]">{blocked}</p><p className="mt-1 text-xs text-[#8b8d88]">Needs owner attention</p></div></section>

              <section id="calendar" className="rounded-2xl border border-[#d5c8b9] bg-[#fffaf6] p-4 shadow-sm sm:p-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><CalendarDays className="size-4 text-[#a24f31]" /><h2 className="font-serif text-2xl font-semibold text-[#23313d]">Appointments</h2></div><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Click a date or time to schedule an appointment or add a private calendar note.</p></div><div className="flex flex-wrap gap-2"><a href="/api/matterpilot/calendar" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#d8c7bb] bg-white px-3.5 text-xs font-semibold text-[#4d5851] transition-colors hover:bg-[#fbf6f1]">Download .ics <ArrowUpRight className="size-3.5" /></a><Button size="sm" onClick={() => openNewAppointment()} className="bg-[#b65f3a] hover:bg-[#9f5030]"><Plus /> New appointment</Button></div></div><CalendarBoardEnhanced appointments={filteredAppointments} onSelect={setSelectedAppointment} onCreate={openNewAppointment} onMove={moveAppointmentFromCalendar} /></section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="flex items-start justify-between border-b border-[#e8e3da] px-5 py-4"><div><h2 className="font-serif text-xl font-semibold text-[#23313d]">Next up</h2><p className="mt-1 text-xs text-[#8b8d88]">The next appointments on your radar</p></div><Link href="/matterpilot?view=calendar" className="text-xs font-semibold text-[#b65f3a] hover:underline">Full calendar <ArrowUpRight className="ml-1 inline size-3.5" /></Link></div><div className="divide-y divide-[#eee8df]">{upcomingAppointments.length ? upcomingAppointments.map((appointment) => <button key={appointment.id} type="button" onClick={() => setSelectedAppointment(appointment)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#fffaf6]"><span className="w-14 shrink-0 text-xs font-semibold text-[#a24f31]">{appointment.startAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(appointment.startAt)) : "Soon"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#35433e]">{appointment.title}</span><span className="mt-1 block truncate text-xs text-[#8b8d88]">{appointment.client} · {appointment.matter}</span></span><span className="shrink-0 text-xs text-[#8b8d88]">{appointment.startAt ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(appointment.startAt)) : ""}</span></button>) : <p className="px-5 py-8 text-sm text-[#8b8d88]">No upcoming appointments yet.</p>}</div></div><div className="rounded-2xl border border-[#d5c8b9] bg-[#ead9c4] p-5 shadow-sm"><div className="flex items-center gap-2 text-[#6f4f3c]"><AlertTriangle className="size-4" /><span className="text-xs font-bold uppercase tracking-[0.16em]">Needs attention</span></div><h2 className="mt-4 font-serif text-2xl font-semibold leading-tight text-[#3b3029]">Keep the next meeting moving.</h2><p className="mt-2 text-sm leading-6 text-[#705d50]">{attentionAppointments.length ? `${attentionAppointments.length} appointment${attentionAppointments.length === 1 ? "" : "s"} still need preparation work.` : "Your upcoming appointments are in good shape."}</p><Link href="/matterpilot?view=tasks" className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#3b3029] px-3.5 text-sm font-semibold text-[#fffaf4] transition-colors hover:bg-[#514238]">Review tasks <ArrowUpRight className="size-4" /></Link></div></section>
            </> : <>
              <section className="rounded-2xl border border-[#d5c8b9] bg-[#fffaf6] px-5 py-6 shadow-sm sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b65f3a]">{pageCopy[view].eyebrow}</p><div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-serif text-3xl font-semibold tracking-[-0.03em] text-[#23313d] sm:text-4xl">{pageCopy[view].title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d817b]">{pageCopy[view].description}</p></div>{view !== "contacts" && view !== "deadlines" ? <Button onClick={() => openNewAppointment()} className="shrink-0 bg-[#b65f3a] hover:bg-[#9f5030]"><Plus /> New appointment</Button> : null}</div></section>

              {view === "calendar" ? <><section className="rounded-2xl border border-[#d5c8b9] bg-[#fffaf6] p-4 shadow-sm sm:p-6"><CalendarBoardEnhanced appointments={filteredAppointments} onSelect={setSelectedAppointment} onCreate={openNewAppointment} onMove={moveAppointmentFromCalendar} /></section><AvailabilityCenter matters={matters} rules={initialAvailabilityRules} blackouts={initialBlackouts} /><section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><CalendarDays className="size-4 text-[#a24f31]" /><h2 className="font-serif text-xl font-semibold text-[#23313d]">Calendar sharing</h2></div><p className="mt-1 max-w-xl text-xs leading-5 text-[#8b8d88]">Download an up-to-date calendar file for appointments and notes, then import it into your preferred calendar app.</p></div><a href="/api/matterpilot/calendar" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#23313d] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#18242e]">Download .ics calendar <ArrowUpRight className="size-3.5" /></a></div></section></> : null}
              {view === "tasks" ? <div className="space-y-6"><TeamTaskCenter tasks={initialTasks} members={initialTaskMembers} /><section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="border-b border-[#e8e3da] px-5 py-4"><h2 className="font-serif text-xl font-semibold text-[#23313d]">Appointment readiness</h2><p className="mt-1 text-xs text-[#8b8d88]">Appointments that still need a preparation step.</p></div>{attentionAppointments.length ? attentionAppointments.map((appointment) => <ReadinessCard key={appointment.id} appointment={appointment} onSelect={() => setSelectedAppointment(appointment)} />) : <p className="px-5 py-8 text-sm text-[#8b8d88]">Nothing needs attention right now.</p>}</section></div> : null}
              {view === "communications" ? <CommunicationCenter communications={initialCommunications} emailDeliveryConfigured={emailDeliveryConfigured} /> : null}
              {view === "deadlines" ? <DeadlineCenter matters={matters} deadlines={initialDeadlines} /> : null}
              {view === "contacts" ? <ContactCenter matters={matters} contacts={initialContacts} /> : null}
              {view === "portal" ? <div className="space-y-6"><PacketCenter appointments={appointments} onSelect={setSelectedAppointment} onCreate={() => openNewAppointment()} /><PortalCenter appointments={appointments} onSelect={setSelectedAppointment} /><PortalMessageInbox messages={initialPortalMessages} /><PortalDocumentRequestCenter matters={matters} requests={initialPortalDocumentRequests} /></div> : null}
            </>}
          </div>
        </main>
      </div>
      <button type="button" onClick={() => openNewAppointment()} className="fixed bottom-5 right-5 z-20 flex size-12 items-center justify-center rounded-full bg-[#b65f3a] text-white shadow-xl shadow-[#b65f3a]/30 sm:hidden" aria-label="New appointment"><Plus className="size-5" /></button>
      {showNew ? <AppointmentComposer matters={matters} initialSlot={selectedSlot} onClose={() => { setShowNew(false); setSelectedSlot(undefined); router.refresh() }} /> : null}
      {selectedAppointment ? <AppointmentDetail appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} onUpdated={() => { setSelectedAppointment(null); router.refresh() }} /> : null}
    </div>
  )
}
