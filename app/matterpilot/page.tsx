import type { Metadata } from "next"

import { MatterPilotDashboard, type Appointment, type DashboardCommunication, type DashboardContact, type DashboardDeadline, type DashboardMember, type DashboardPortalDocumentRequest, type DashboardTask, type DashboardView } from "@/components/matterpilot/dashboard"
import { isTransactionalEmailConfigured } from "@/lib/email/resend"
import { parseCustomWorkflows } from "@/lib/matterpilot/customizations"
import { getDocumentTemplate } from "@/lib/matterpilot/documents"
import { getWorkflow } from "@/lib/matterpilot/workflows"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "MatterPilot",
  description: "Matter-aware scheduling and legal operations workspace.",
}

export default async function MatterPilotPage({ searchParams }: { searchParams?: Promise<{ view?: string | string[] }> }) {
  const params = searchParams ? await searchParams : {}
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view
  const view = ["overview", "calendar", "tasks", "communications", "deadlines", "contacts", "portal"].includes(requestedView ?? "")
    ? requestedView as DashboardView
    : "overview"
  const supabase = await createClient()
  const { data: matters } = await supabase
    .from("matters")
    .select("id, name, matter_number, case_mode, status")
    .order("created_at", { ascending: false })
    .limit(8)
  const { data: userData } = await supabase.auth.getUser()
  const { data: preferenceRow } = userData.user
    ? await supabase.from("user_preferences").select("preferences").eq("user_id", userData.user.id).maybeSingle()
    : { data: null }
  const customWorkflows = parseCustomWorkflows(preferenceRow?.preferences && typeof preferenceRow.preferences === "object" && !Array.isArray(preferenceRow.preferences) ? preferenceRow.preferences.customWorkflows : undefined)

  const matterRows = matters ?? []
  const matterIds = matterRows.map((matter) => matter.id)
  const { data: portalGrants } = matterIds.length
    ? await supabase.from("client_portal_grants").select("id, matter_id, client_email, status, last_accessed_at, revoked_at").in("matter_id", matterIds)
    : { data: [] }
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
    ? await supabase.from("matter_deadlines").select("id, matter_id, title, kind, due_at, priority, status, notes, assigned_to, trigger_at, calculation_note").in("matter_id", matterIds).order("due_at", { ascending: true }).limit(100)
    : { data: [] }
  const { data: contacts } = matterIds.length
    ? await supabase.from("matter_contacts").select("id, matter_id, display_name, contact_type, email, phone, notes, status").in("matter_id", matterIds).order("display_name", { ascending: true }).limit(200)
    : { data: [] }
  const { data: availabilityRules } = matterIds.length
    ? await supabase.from("calendar_availability_rules").select("id, matter_id, weekday, start_time, end_time, timezone, label, is_active").in("matter_id", matterIds).eq("is_active", true).order("weekday", { ascending: true }).order("start_time", { ascending: true })
    : { data: [] }
  const { data: calendarBlackouts } = matterIds.length
    ? await supabase.from("calendar_blackouts").select("id, matter_id, starts_at, ends_at, reason, status").in("matter_id", matterIds).eq("status", "active").order("starts_at", { ascending: true }).limit(50)
    : { data: [] }
  const { data: portalMessages } = matterIds.length
    ? await supabase.from("client_portal_messages").select("id, matter_id, sender_role, sender_email, body, created_at").in("matter_id", matterIds).order("created_at", { ascending: true }).limit(200)
    : { data: [] }
  const { data: portalDocumentRequests } = matterIds.length
    ? await supabase.from("client_portal_document_requests").select("id, matter_id, appointment_id, title, description, status, file_name, mime_type, size_bytes, uploaded_at, reviewer_note, created_at").in("matter_id", matterIds).order("created_at", { ascending: false }).limit(200)
    : { data: [] }

  const appointmentIds = (appointments ?? []).map((appointment) => appointment.id)
  const [{ data: tasks }, { data: documents }, { data: participants }, { data: packets }, { data: communications }] = appointmentIds.length
    ? await Promise.all([
        supabase.from("appointment_tasks").select("id, matter_id, appointment_id, label, status, is_blocking, due_at, assigned_to").in("appointment_id", appointmentIds),
        supabase.from("appointment_documents").select("id, appointment_id, name, status, is_required").in("appointment_id", appointmentIds),
        supabase.from("appointment_participants").select("id, appointment_id, display_name, response_status, is_required").in("appointment_id", appointmentIds),
        supabase.from("appointment_packets").select("id, appointment_id, status, expires_at, viewed_at, completed_at").in("appointment_id", appointmentIds),
        supabase.from("appointment_communications").select("id, appointment_id, channel, direction, status, recipient, subject, body, created_at, sent_at, provider, error_message, attempt_count, last_attempt_at").in("appointment_id", appointmentIds).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }]
  const documentIds = (documents ?? []).map((document) => document.id)
  const { data: drafts } = documentIds.length
    ? await supabase
        .from("appointment_document_drafts")
        .select("id, appointment_document_id, template_key, content, status, visibility, field_schema, field_values")
        .in("appointment_document_id", documentIds)
    : { data: [] }
  const { data: draftVersions } = documentIds.length
    ? await supabase
        .from("appointment_document_versions")
        .select("id, appointment_document_id, version_number, content, status, visibility, field_schema, field_values, created_at")
        .in("appointment_document_id", documentIds)
        .order("version_number", { ascending: false })
    : { data: [] }
  const { data: signatures } = documentIds.length
    ? await supabase.from("appointment_document_signatures").select("id, appointment_document_id, signer_role, status, signer_name, signer_email, signed_at").in("appointment_document_id", documentIds)
    : { data: [] }
  const packetIds = (packets ?? []).map((packet) => packet.id)
  const { data: packetReminders } = packetIds.length
    ? await supabase.from("appointment_packet_reminders").select("id, packet_id, kind, send_at, status").in("packet_id", packetIds)
    : { data: [] }
  const taskIds = (tasks ?? []).map((task) => task.id)
  const [{ data: taskDependencies }, { data: matterMembers }, { data: profiles }] = await Promise.all([
    taskIds.length ? supabase.from("appointment_task_dependencies").select("id, matter_id, task_id, depends_on_task_id").in("task_id", taskIds) : Promise.resolve({ data: [] }),
    matterIds.length ? supabase.from("matter_members").select("matter_id, user_id, role").in("matter_id", matterIds) : Promise.resolve({ data: [] }),
    supabase.from("profiles").select("id, full_name, email").limit(200),
  ])

  const matterNames = new Map(matterRows.map((matter) => [matter.id, matter.name]))
  const taskById = new Map((tasks ?? []).map((task) => [task.id, task]))
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const initialTaskMembers: DashboardMember[] = (matterMembers ?? []).map((member) => {
    const profile = profileById.get(member.user_id)
    return { userId: member.user_id, name: profile?.full_name || profile?.email || "Team member", email: profile?.email || "", role: member.role }
  }).filter((member, index, all) => all.findIndex((item) => item.userId === member.userId) === index)
  const initialTasks: DashboardTask[] = (tasks ?? []).map((task) => {
    const appointment = (appointments ?? []).find((item) => item.id === task.appointment_id)
    const assignedProfile = task.assigned_to ? profileById.get(task.assigned_to) : null
    return {
      id: task.id,
      matterId: task.matter_id,
      matter: matterNames.get(task.matter_id) ?? "Matter",
      appointmentId: task.appointment_id,
      appointment: appointment?.title ?? "Appointment",
      label: task.label,
      status: task.status as DashboardTask["status"],
      isBlocking: task.is_blocking,
      dueAt: task.due_at,
      assignedTo: task.assigned_to,
      assignedName: assignedProfile?.full_name || assignedProfile?.email || "Unassigned",
      dependencies: (taskDependencies ?? []).filter((dependency) => dependency.task_id === task.id).map((dependency) => {
        const dependsOn = taskById.get(dependency.depends_on_task_id)
        return { id: dependency.id, taskId: dependency.task_id, dependsOnTaskId: dependency.depends_on_task_id, dependsOnLabel: dependsOn?.label ?? "Task", dependsOnStatus: (dependsOn?.status ?? "open") as "open" | "done" | "waived" }
      }),
    }
  })
  const initialAppointments: Appointment[] = (appointments ?? []).map((appointment) => {
    const start = new Date(appointment.starts_at)
    const end = new Date(appointment.ends_at)
    const day = (start.getUTCDay() + 6) % 7
    const tasksForAppointment = (tasks ?? []).filter((task) => task.appointment_id === appointment.id)
    const documentsForAppointment = (documents ?? []).filter((document) => document.appointment_id === appointment.id)
    const participantsForAppointment = (participants ?? []).filter((participant) => participant.appointment_id === appointment.id)
    const packetForAppointment = (packets ?? []).find((packet) => packet.appointment_id === appointment.id)
    const portalGrantForAppointment = (portalGrants ?? []).find((grant) => grant.matter_id === appointment.matter_id && grant.client_email.toLowerCase() === (appointment.client_email ?? "").toLowerCase())
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
      startAt: appointment.starts_at,
      endAt: appointment.ends_at,
      date: appointment.starts_at.slice(0, 10),
      readiness: (blocked ? "blocked" : atRisk ? "at_risk" : "ready") as Appointment["readiness"],
      participants: participantsForAppointment.length,
      location: appointment.location || "Location to be confirmed",
      owner: "Matter team",
      checklist: tasksForAppointment.map((task) => ({ id: task.id, label: task.label, done: task.status !== "open", status: task.status as "open" | "done" | "waived", isBlocking: task.is_blocking })),
      documents: documentsForAppointment.map((document) => {
        const draft = (drafts ?? []).find((item) => item.appointment_document_id === document.id)
        const signature = (signatures ?? []).find((item) => item.appointment_document_id === document.id && item.signer_role === "client")
        return {
          id: document.id,
          label: document.name,
          status: document.status === "received" || document.status === "signed" || document.status === "waived" ? "ready" : "requested",
          sourceStatus: document.status as "requested" | "received" | "signed" | "waived",
          isRequired: document.is_required,
          draftId: draft?.id,
          draftContent: draft?.content,
          draftStatus: draft?.status as "draft" | "final" | undefined,
          draftVisibility: draft?.visibility as "internal" | "client" | undefined,
          signatureStatus: signature?.status as "requested" | "signed" | "declined" | "cancelled" | undefined,
          versions: draft ? (draftVersions ?? []).filter((version) => version.appointment_document_id === document.id).map((version) => ({ id: version.id, versionNumber: version.version_number, content: version.content, status: version.status as "draft" | "final", visibility: version.visibility as "internal" | "client", createdAt: version.created_at })) : [],
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
      portalAccess: portalGrantForAppointment ? {
        id: portalGrantForAppointment.id,
        status: portalGrantForAppointment.status as "active" | "revoked",
        lastAccessedAt: portalGrantForAppointment.last_accessed_at,
        revokedAt: portalGrantForAppointment.revoked_at,
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
      startAt: note.starts_at,
      endAt: note.ends_at,
      date: note.starts_at.slice(0, 10),
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
      provider: communication.provider,
      errorMessage: communication.error_message,
      attemptCount: communication.attempt_count,
      lastAttemptAt: communication.last_attempt_at,
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
      triggerAt: deadline.trigger_at,
      calculationNote: deadline.calculation_note,
    }
  })

  const contactDuplicateGroups = new Map<string, typeof contacts>()
  for (const contact of contacts ?? []) {
    const key = contact.email?.trim().toLowerCase() || contact.display_name.trim().toLowerCase()
    if (!key) continue
    const group = contactDuplicateGroups.get(key) ?? []
    group.push(contact)
    contactDuplicateGroups.set(key, group)
  }

  const initialContacts: DashboardContact[] = (contacts ?? []).map((contact) => {
    const duplicateKey = contact.email?.trim().toLowerCase() || contact.display_name.trim().toLowerCase()
    const duplicateMatterNames = [...new Set(
      (contactDuplicateGroups.get(duplicateKey) ?? [])
        .filter((candidate) => candidate.id !== contact.id && candidate.matter_id !== contact.matter_id)
        .map((candidate) => matterNames.get(candidate.matter_id) ?? "Another matter"),
    )]
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
      duplicateMatterNames,
    }
  })

  return <MatterPilotDashboard view={view} matters={matterRows} customWorkflows={customWorkflows} initialAppointments={[...initialAppointments, ...noteAppointments]} initialCommunications={initialCommunications} emailDeliveryConfigured={isTransactionalEmailConfigured()} initialDeadlines={initialDeadlines} initialContacts={initialContacts} initialTasks={initialTasks} initialTaskMembers={initialTaskMembers} initialAvailabilityRules={(availabilityRules ?? []).map((rule) => ({ id: rule.id, matterId: rule.matter_id, weekday: rule.weekday, startTime: rule.start_time.slice(0, 5), endTime: rule.end_time.slice(0, 5), timezone: rule.timezone, label: rule.label }))} initialBlackouts={(calendarBlackouts ?? []).map((blackout) => ({ id: blackout.id, matterId: blackout.matter_id, startsAt: blackout.starts_at, endsAt: blackout.ends_at, reason: blackout.reason }))} initialPortalMessages={(portalMessages ?? []).map((message) => ({ id: message.id, matterId: message.matter_id, matter: matterNames.get(message.matter_id) ?? "Matter", senderRole: message.sender_role as "client" | "firm", senderEmail: message.sender_email, body: message.body, createdAt: message.created_at }))} initialPortalDocumentRequests={(portalDocumentRequests ?? []).map((request): DashboardPortalDocumentRequest => ({ id: request.id, matterId: request.matter_id, matter: matterNames.get(request.matter_id) ?? "Matter", appointmentId: request.appointment_id, title: request.title, description: request.description, status: request.status as DashboardPortalDocumentRequest["status"], fileName: request.file_name, mimeType: request.mime_type, sizeBytes: request.size_bytes, uploadedAt: request.uploaded_at, reviewerNote: request.reviewer_note, createdAt: request.created_at }))} userName="Maya" />
}
