import type { Metadata } from "next"

import { MatterPilotDashboard, type Appointment, type DashboardCommunication, type DashboardContact, type DashboardDeadline } from "@/components/matterpilot/dashboard"
import { getDocumentTemplate } from "@/lib/matterpilot/documents"
import { getWorkflow } from "@/lib/matterpilot/workflows"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "MatterPilot",
  description: "Matter-aware scheduling and legal operations workspace.",
}

export default async function MatterPilotPage() {
  const supabase = await createClient()
  const { data: matters } = await supabase
    .from("matters")
    .select("id, name, matter_number, case_mode, status")
    .order("created_at", { ascending: false })
    .limit(8)

  const matterRows = matters ?? []
  const matterIds = matterRows.map((matter) => matter.id)
  const { data: calendarNotes } = await supabase
    .from("calendar_notes")
    .select("id, matter_id, title, note, starts_at, ends_at")
    .order("starts_at", { ascending: true })
    .limit(100)
  const { data: appointments } = matterIds.length
    ? await supabase
        .from("appointments")
        .select("id, matter_id, workflow_key, title, starts_at, ends_at, status, conflict_status, location, notes, client_name, client_email")
        .in("matter_id", matterIds)
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true })
        .limit(100)
    : { data: [] }
  const { data: deadlines } = matterIds.length
    ? await supabase.from("matter_deadlines").select("id, matter_id, title, kind, due_at, priority, status, notes, assigned_to").in("matter_id", matterIds).order("due_at", { ascending: true }).limit(100)
    : { data: [] }
  const { data: contacts } = matterIds.length
    ? await supabase.from("matter_contacts").select("id, matter_id, display_name, contact_type, email, phone, notes, status").in("matter_id", matterIds).order("display_name", { ascending: true }).limit(200)
    : { data: [] }

  const appointmentIds = (appointments ?? []).map((appointment) => appointment.id)
  const [{ data: tasks }, { data: documents }, { data: participants }, { data: packets }, { data: communications }] = appointmentIds.length
    ? await Promise.all([
        supabase.from("appointment_tasks").select("id, appointment_id, label, status, is_blocking").in("appointment_id", appointmentIds),
        supabase.from("appointment_documents").select("id, appointment_id, name, status, is_required").in("appointment_id", appointmentIds),
        supabase.from("appointment_participants").select("id, appointment_id, display_name, response_status, is_required").in("appointment_id", appointmentIds),
        supabase.from("appointment_packets").select("id, appointment_id, status, expires_at, viewed_at, completed_at").in("appointment_id", appointmentIds),
        supabase.from("appointment_communications").select("id, appointment_id, channel, direction, status, recipient, subject, body, created_at, sent_at").in("appointment_id", appointmentIds).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }]
  const documentIds = (documents ?? []).map((document) => document.id)
  const { data: drafts } = documentIds.length
    ? await supabase
        .from("appointment_document_drafts")
        .select("id, appointment_document_id, template_key, content, status")
        .in("appointment_document_id", documentIds)
    : { data: [] }
  const packetIds = (packets ?? []).map((packet) => packet.id)
  const { data: packetReminders } = packetIds.length
    ? await supabase.from("appointment_packet_reminders").select("id, packet_id, kind, send_at, status").in("packet_id", packetIds)
    : { data: [] }

  const matterNames = new Map(matterRows.map((matter) => [matter.id, matter.name]))
  const initialAppointments: Appointment[] = (appointments ?? []).map((appointment) => {
    const start = new Date(appointment.starts_at)
    const end = new Date(appointment.ends_at)
    const day = (start.getUTCDay() + 6) % 7
    const tasksForAppointment = (tasks ?? []).filter((task) => task.appointment_id === appointment.id)
    const documentsForAppointment = (documents ?? []).filter((document) => document.appointment_id === appointment.id)
    const participantsForAppointment = (participants ?? []).filter((participant) => participant.appointment_id === appointment.id)
    const packetForAppointment = (packets ?? []).find((packet) => packet.appointment_id === appointment.id)
    const remindersForPacket = packetForAppointment ? (packetReminders ?? []).filter((reminder) => reminder.packet_id === packetForAppointment.id) : []
    const communicationsForAppointment = (communications ?? []).filter((communication) => communication.appointment_id === appointment.id)
    const participantDeclined = participantsForAppointment.some((participant) => participant.is_required && participant.response_status === "declined")
    const blocked = appointment.conflict_status === "issue" || participantDeclined || tasksForAppointment.some((task) => task.is_blocking && task.status === "open") || documentsForAppointment.some((document) => document.is_required && document.status === "requested")
    const atRisk = !blocked && (appointment.conflict_status === "pending" || tasksForAppointment.some((task) => task.status === "open") || participantsForAppointment.some((participant) => participant.is_required && participant.response_status === "pending"))
    return {
      id: appointment.id,
      title: appointment.title,
      client: appointment.client_name || "Unassigned client",
      clientEmail: appointment.client_email,
      matter: matterNames.get(appointment.matter_id) || "Matter",
      matterId: appointment.matter_id,
      type: appointment.workflow_key === "custom" ? "MatterPilot appointment" : getWorkflow(appointment.workflow_key).label,
      workflowKey: appointment.workflow_key,
      notes: appointment.notes,
      conflictStatus: appointment.conflict_status as "pending" | "clear" | "issue",
      day,
      start: start.getUTCHours() + start.getUTCMinutes() / 60,
      end: end.getUTCHours() + end.getUTCMinutes() / 60,
      readiness: (blocked ? "blocked" : atRisk ? "at_risk" : "ready") as Appointment["readiness"],
      participants: participantsForAppointment.length,
      location: appointment.location || "Location to be confirmed",
      owner: "Matter team",
      checklist: tasksForAppointment.map((task) => ({ id: task.id, label: task.label, done: task.status !== "open", status: task.status as "open" | "done" | "waived", isBlocking: task.is_blocking })),
      documents: documentsForAppointment.map((document) => {
        const draft = (drafts ?? []).find((item) => item.appointment_document_id === document.id)
        return {
          id: document.id,
          label: document.name,
          status: document.status === "received" || document.status === "signed" || document.status === "waived" ? "ready" : "requested",
          sourceStatus: document.status as "requested" | "received" | "signed" | "waived",
          isRequired: document.is_required,
          draftId: draft?.id,
          draftContent: draft?.content,
          draftStatus: draft?.status as "draft" | "final" | undefined,
          templateKey: getDocumentTemplate(document.name)?.key ?? null,
        }
      }),
      participantDetails: participantsForAppointment.map((participant) => ({ id: participant.id, displayName: participant.display_name, responseStatus: participant.response_status as "pending" | "confirmed" | "declined", isRequired: participant.is_required })),
      communications: communicationsForAppointment.map((communication) => ({ id: communication.id, channel: communication.channel as "email" | "sms", direction: communication.direction as "outbound" | "inbound", status: communication.status as "draft" | "queued" | "sent" | "failed" | "cancelled", recipient: communication.recipient, subject: communication.subject, body: communication.body, createdAt: communication.created_at, sentAt: communication.sent_at })),
      packet: packetForAppointment ? {
        id: packetForAppointment.id,
        status: packetForAppointment.status === "active" && new Date(packetForAppointment.expires_at) <= new Date()
          ? "expired"
          : packetForAppointment.status as "active" | "completed" | "revoked" | "expired",
        expiresAt: packetForAppointment.expires_at,
        viewedAt: packetForAppointment.viewed_at,
        completedAt: packetForAppointment.completed_at,
        reminders: remindersForPacket.map((reminder) => ({ id: reminder.id, kind: reminder.kind as "first_reminder" | "final_reminder", sendAt: reminder.send_at, status: reminder.status as "planned" | "sent" | "cancelled" })),
      } : undefined,
    }
  })

  const noteAppointments: Appointment[] = (calendarNotes ?? []).map((note) => {
    const start = new Date(note.starts_at)
    const end = new Date(note.ends_at)
    return {
      id: note.id,
      title: note.title,
      client: "Calendar note",
      matter: note.matter_id ? matterNames.get(note.matter_id) || "Matter" : "Personal calendar",
      matterId: note.matter_id || "",
      type: "Quick calendar note",
      workflowKey: "quick_note",
      notes: note.note,
      isNote: true,
      conflictStatus: undefined,
      day: (start.getUTCDay() + 6) % 7,
      start: start.getUTCHours() + start.getUTCMinutes() / 60,
      end: end.getUTCHours() + end.getUTCMinutes() / 60,
      readiness: "ready",
      participants: 0,
      location: "Internal calendar",
      owner: "Personal note",
      checklist: [],
      documents: [],
      participantDetails: [],
    }
  })

  const initialCommunications: DashboardCommunication[] = (communications ?? []).map((communication) => {
    const appointment = (appointments ?? []).find((item) => item.id === communication.appointment_id)
    return {
      id: communication.id,
      matterId: appointment?.matter_id ?? "",
      appointmentId: communication.appointment_id,
      matter: appointment ? matterNames.get(appointment.matter_id) ?? "Matter" : "Matter",
      appointment: appointment?.title ?? "Appointment",
      client: appointment?.client_name ?? "Unassigned client",
      channel: communication.channel as "email" | "sms",
      direction: communication.direction as "outbound" | "inbound",
      status: communication.status as "draft" | "queued" | "sent" | "failed" | "cancelled",
      recipient: communication.recipient,
      subject: communication.subject,
      body: communication.body,
      createdAt: communication.created_at,
      sentAt: communication.sent_at,
    }
  })

  const now = new Date().getTime()
  const initialDeadlines: DashboardDeadline[] = (deadlines ?? []).map((deadline) => {
    const dueAt = new Date(deadline.due_at)
    const daysUntilDue = (dueAt.getTime() - now) / (24 * 60 * 60 * 1000)
    const status = deadline.status === "done" ? "completed" : deadline.status === "waived" ? "waived" : daysUntilDue < 0 ? "missed" : daysUntilDue <= 7 ? "at_risk" : "open"
    return {
      id: deadline.id,
      matterId: deadline.matter_id,
      matter: matterNames.get(deadline.matter_id) ?? "Matter",
      title: deadline.title,
      kind: deadline.kind as DashboardDeadline["kind"],
      dueAt: deadline.due_at,
      priority: deadline.priority as DashboardDeadline["priority"],
      status,
      notes: deadline.notes,
      assignedTo: deadline.assigned_to,
    }
  })

  const initialContacts: DashboardContact[] = (contacts ?? []).map((contact) => {
    const appointmentCount = (appointments ?? []).filter((appointment) => {
      if (appointment.matter_id !== contact.matter_id) return false
      const participantMatch = (participants ?? []).some((participant) => participant.appointment_id === appointment.id && participant.display_name.toLowerCase() === contact.display_name.toLowerCase())
      return participantMatch || appointment.client_name?.toLowerCase() === contact.display_name.toLowerCase()
    }).length
    const openDeadlineCount = (deadlines ?? []).filter((deadline) => deadline.matter_id === contact.matter_id && deadline.status === "open").length
    return {
      id: contact.id,
      matterId: contact.matter_id,
      matter: matterNames.get(contact.matter_id) ?? "Matter",
      name: contact.display_name,
      role: contact.contact_type as DashboardContact["role"],
      email: contact.email,
      phone: contact.phone,
      notes: contact.notes,
      status: contact.status as "active" | "archived",
      appointmentCount,
      openDeadlineCount,
    }
  })

  return <MatterPilotDashboard matters={matterRows} initialAppointments={[...initialAppointments, ...noteAppointments]} initialCommunications={initialCommunications} initialDeadlines={initialDeadlines} initialContacts={initialContacts} userName="Maya" />
}
