"use server"

import { revalidatePath } from "next/cache"
import { randomBytes } from "node:crypto"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getDocumentTemplate, renderDocumentTemplate } from "@/lib/matterpilot/documents"
import { getWorkflow, getWorkflowByLabel, getWorkflowDurationMinutes } from "@/lib/matterpilot/workflows"

const appointmentSchema = z.object({
  matterId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(160),
  typeName: z.string().trim().min(2).max(120),
  workflowKey: z.string().trim().min(2).max(60),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(2000).optional(),
  clientName: z.string().trim().max(160).optional(),
  clientEmail: z.string().trim().email().optional().or(z.literal("")),
  newClientCaseMode: z.enum(["criminal_defense", "civil_defense"]).optional(),
})

export type MatterPilotActionResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string }

export async function createAppointmentAction(input: z.input<typeof appointmentSchema>): Promise<MatterPilotActionResult> {
  const parsed = appointmentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Enter a title, matter, and valid appointment time." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before creating an appointment." }

  const workflow = getWorkflow(parsed.data.workflowKey)
  let matterId = parsed.data.matterId || ""
  if (!matterId) {
    if (workflow.key !== "initial_consultation") return { ok: false, error: "Choose a matter for this workflow, or use Initial consultation for a new client." }
    if (!parsed.data.clientName?.trim()) return { ok: false, error: "Add the prospective client's name to schedule a new-client consultation." }

    const intakeName = `New client intake — ${parsed.data.clientName.trim()}`
    const { data: intakeMatter, error: intakeMatterError } = await supabase.rpc("create_matter", {
      p_matter_number: `INTAKE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      p_name: intakeName,
      p_case_mode: parsed.data.newClientCaseMode ?? "criminal_defense",
    })
    if (intakeMatterError || !intakeMatter) return { ok: false, error: intakeMatterError?.message ?? "Unable to create the new-client intake." }
    matterId = intakeMatter.id
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      matter_id: matterId,
      workflow_key: workflow.key,
      title: parsed.data.title,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
      client_name: parsed.data.clientName || null,
      client_email: parsed.data.clientEmail || null,
      created_by: userData.user.id,
      status: "tentative",
      conflict_status: "pending",
    })
    .select("id")
    .single()

  if (error || !appointment) return { ok: false, error: error?.message ?? "Unable to create the appointment." }

  const requiredTasks = workflow.tasks.map((label) => ({ label, is_blocking: true }))
  const { error: taskError } = await supabase.from("appointment_tasks").insert(
    requiredTasks.map((task) => ({
      matter_id: matterId,
      appointment_id: appointment.id,
      ...task,
      created_by: userData.user.id,
    }))
  )
  if (taskError) return { ok: false, error: taskError.message }

  if (workflow.documents.length) {
    const { error: documentError } = await supabase.from("appointment_documents").insert(
      workflow.documents.map((name) => ({
        matter_id: matterId,
        appointment_id: appointment.id,
        name,
        status: "requested",
        is_required: true,
        created_by: userData.user.id,
      }))
    )
    if (documentError) return { ok: false, error: documentError.message }
  }

  if (parsed.data.clientName?.trim()) {
    const { error: participantError } = await supabase.from("appointment_participants").insert({
      matter_id: matterId,
      appointment_id: appointment.id,
      display_name: parsed.data.clientName.trim(),
      email: parsed.data.clientEmail || null,
      participant_role: workflow.key === "expert_consultation" ? "expert" : workflow.key === "witness_interview" ? "witness" : "client",
      response_status: "pending",
      is_required: true,
    })
    if (participantError) return { ok: false, error: participantError.message }
  }

  const { error: reminderError } = await supabase.from("appointment_reminders").insert(
    [
      { channel: "email", send_at: parsed.data.startsAt, status: "planned" },
      { channel: "email", send_at: new Date(Math.max(Date.now(), new Date(parsed.data.startsAt).getTime() - 24 * 60 * 60 * 1000)).toISOString(), status: "planned" },
    ].map((reminder) => ({ ...reminder, matter_id: matterId, appointment_id: appointment.id }))
  )
  if (reminderError) return { ok: false, error: reminderError.message }

  revalidatePath("/matterpilot")
  revalidatePath("/matters")
  return { ok: true, appointmentId: appointment.id }
}

const calendarNoteSchema = z.object({
  title: z.string().trim().min(2).max(160),
  note: z.string().trim().min(1).max(2000),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  matterId: z.string().uuid().optional().or(z.literal("")),
})

export async function createCalendarNoteAction(input: z.input<typeof calendarNoteSchema>): Promise<MatterPilotActionResult> {
  const parsed = calendarNoteSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Add a short title and note before saving." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before adding a calendar note." }

  const { data: note, error } = await supabase.from("calendar_notes").insert({
    title: parsed.data.title,
    note: parsed.data.note,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    matter_id: parsed.data.matterId || null,
    created_by: userData.user.id,
  }).select("id").single()

  if (error || !note) return { ok: false, error: error?.message ?? "Unable to save the calendar note." }
  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: note.id }
}

const deadlineSchema = z.object({
  matterId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  kind: z.enum(["court_date", "filing", "discovery", "client", "internal", "other"]),
  dueAt: z.string().datetime(),
  priority: z.enum(["normal", "high", "critical"]),
  notes: z.string().trim().max(2000).optional(),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
})

export type DeadlineActionResult =
  | { ok: true; deadlineId: string }
  | { ok: false; error: string }

export async function createMatterDeadlineAction(input: z.input<typeof deadlineSchema>): Promise<DeadlineActionResult> {
  const parsed = deadlineSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Add a title, matter, and valid deadline date." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before adding a deadline." }

  const { data, error } = await supabase.from("matter_deadlines").insert({
    matter_id: parsed.data.matterId,
    title: parsed.data.title,
    kind: parsed.data.kind,
    due_at: parsed.data.dueAt,
    priority: parsed.data.priority,
    notes: parsed.data.notes || null,
    assigned_to: parsed.data.assignedTo || null,
    created_by: userData.user.id,
    updated_at: new Date().toISOString(),
  }).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to save that deadline." }

  revalidatePath("/matterpilot")
  return { ok: true, deadlineId: data.id }
}

const deadlineStatusSchema = z.object({
  matterId: z.string().uuid(),
  deadlineId: z.string().uuid(),
  status: z.enum(["open", "done", "waived"]),
})

export async function updateMatterDeadlineStatusAction(input: z.input<typeof deadlineStatusSchema>): Promise<DeadlineActionResult> {
  const parsed = deadlineStatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That deadline could not be updated." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before updating a deadline." }

  const { data, error } = await supabase.from("matter_deadlines").update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq("id", parsed.data.deadlineId).eq("matter_id", parsed.data.matterId).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "That deadline is no longer available." }

  revalidatePath("/matterpilot")
  return { ok: true, deadlineId: data.id }
}

const contactSchema = z.object({
  matterId: z.string().uuid(),
  displayName: z.string().trim().min(2).max(180),
  contactType: z.enum(["client", "prospective_client", "witness", "expert", "opposing_counsel", "other"]),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export type ContactActionResult =
  | { ok: true; contactId: string }
  | { ok: false; error: string }

export async function createMatterContactAction(input: z.input<typeof contactSchema>): Promise<ContactActionResult> {
  const parsed = contactSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Add a name and valid contact details." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before adding a contact." }

  const { data, error } = await supabase.from("matter_contacts").insert({
    matter_id: parsed.data.matterId,
    display_name: parsed.data.displayName,
    contact_type: parsed.data.contactType,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    notes: parsed.data.notes || null,
    created_by: userData.user.id,
    updated_at: new Date().toISOString(),
  }).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to save that contact." }

  revalidatePath("/matterpilot")
  return { ok: true, contactId: data.id }
}

const contactStatusSchema = z.object({
  matterId: z.string().uuid(),
  contactId: z.string().uuid(),
  status: z.enum(["active", "archived"]),
})

export async function updateMatterContactStatusAction(input: z.input<typeof contactStatusSchema>): Promise<ContactActionResult> {
  const parsed = contactStatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That contact could not be updated." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before updating a contact." }

  const { data, error } = await supabase.from("matter_contacts").update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq("id", parsed.data.contactId).eq("matter_id", parsed.data.matterId).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "That contact is no longer available." }

  revalidatePath("/matterpilot")
  return { ok: true, contactId: data.id }
}

const appointmentTaskUpdateSchema = z.object({
  matterId: z.string().uuid(),
  taskId: z.string().uuid(),
  status: z.enum(["open", "done", "waived"]),
})

export async function updateAppointmentTaskAction(input: z.input<typeof appointmentTaskUpdateSchema>): Promise<MatterPilotActionResult> {
  const parsed = appointmentTaskUpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That task could not be updated." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before updating preparation." }

  const { data, error } = await supabase
    .from("appointment_tasks")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.taskId)
    .eq("matter_id", parsed.data.matterId)
    .select("appointment_id")
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to update that task." }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: data.appointment_id }
}

const appointmentDocumentUpdateSchema = z.object({
  matterId: z.string().uuid(),
  documentId: z.string().uuid(),
  status: z.enum(["requested", "received", "signed", "waived"]),
})

export async function updateAppointmentDocumentAction(input: z.input<typeof appointmentDocumentUpdateSchema>): Promise<MatterPilotActionResult> {
  const parsed = appointmentDocumentUpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That document could not be updated." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before updating documents." }

  const { data, error } = await supabase
    .from("appointment_documents")
    .update({
      status: parsed.data.status,
      received_at: parsed.data.status === "received" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.documentId)
    .eq("matter_id", parsed.data.matterId)
    .select("appointment_id")
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to update that document." }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: data.appointment_id }
}

const createDocumentDraftSchema = z.object({
  matterId: z.string().uuid(),
  documentId: z.string().uuid(),
})

export type DocumentDraftActionResult =
  | { ok: true; appointmentId: string; draftId: string; content: string }
  | { ok: false; error: string }

function formatDraftDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

function formatDraftTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value))
}

export async function createAppointmentDocumentDraftAction(input: z.input<typeof createDocumentDraftSchema>): Promise<DocumentDraftActionResult> {
  const parsed = createDocumentDraftSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That document could not be prepared." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before creating a document draft." }

  const [{ data: document, error: documentError }, { data: matter, error: matterError }] = await Promise.all([
    supabase.from("appointment_documents").select("id, appointment_id, name").eq("id", parsed.data.documentId).eq("matter_id", parsed.data.matterId).single(),
    supabase.from("matters").select("name, matter_number").eq("id", parsed.data.matterId).single(),
  ])
  if (documentError || !document) return { ok: false, error: "This preparation document is no longer available." }
  if (matterError || !matter) return { ok: false, error: "The matter could not be loaded for this draft." }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, starts_at, location, client_name")
    .eq("id", document.appointment_id)
    .eq("matter_id", parsed.data.matterId)
    .single()
  if (appointmentError || !appointment) return { ok: false, error: "The appointment could not be loaded for this draft." }

  const template = getDocumentTemplate(document.name)
  if (!template) return { ok: false, error: "This preparation item does not have a ready-made template yet." }

  const content = renderDocumentTemplate(template, {
    clientName: appointment.client_name || "Client name to confirm",
    matterName: matter.name,
    matterNumber: matter.matter_number,
    appointmentDate: formatDraftDate(appointment.starts_at),
    appointmentTime: formatDraftTime(appointment.starts_at),
    location: appointment.location || "Location to confirm",
    attorneyOrFirmName: "Harbor Legal",
  })

  const { data: draft, error: draftError } = await supabase
    .from("appointment_document_drafts")
    .upsert({
      matter_id: parsed.data.matterId,
      appointment_document_id: document.id,
      template_key: template.key,
      content,
      status: "draft",
      created_by: userData.user.id,
      updated_by: userData.user.id,
    }, { onConflict: "appointment_document_id" })
    .select("id, content")
    .single()
  if (draftError || !draft) return { ok: false, error: draftError?.message ?? "Unable to save the document draft." }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: appointment.id, draftId: draft.id, content: draft.content }
}

const saveDocumentDraftSchema = z.object({
  matterId: z.string().uuid(),
  draftId: z.string().uuid(),
  content: z.string().min(1).max(30000),
})

export async function saveAppointmentDocumentDraftAction(input: z.input<typeof saveDocumentDraftSchema>): Promise<DocumentDraftActionResult> {
  const parsed = saveDocumentDraftSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Add content before saving this draft." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before saving a document draft." }

  const { data: draft, error: draftError } = await supabase
    .from("appointment_document_drafts")
    .update({ content: parsed.data.content, updated_by: userData.user.id, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.draftId)
    .eq("matter_id", parsed.data.matterId)
    .select("id, content, appointment_document_id")
    .single()
  if (draftError || !draft) return { ok: false, error: draftError?.message ?? "Unable to save this document draft." }

  const { data: document, error: documentError } = await supabase
    .from("appointment_documents")
    .select("appointment_id")
    .eq("id", draft.appointment_document_id)
    .eq("matter_id", parsed.data.matterId)
    .single()
  if (documentError || !document) return { ok: false, error: "The appointment linked to this draft could not be found." }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: document.appointment_id, draftId: draft.id, content: draft.content }
}

const documentDraftStatusSchema = z.object({
  matterId: z.string().uuid(),
  draftId: z.string().uuid(),
  status: z.enum(["draft", "final"]),
})

export async function updateAppointmentDocumentDraftStatusAction(input: z.input<typeof documentDraftStatusSchema>): Promise<MatterPilotActionResult> {
  const parsed = documentDraftStatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That draft status could not be updated." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before approving a document draft." }

  const { data: draft, error: draftError } = await supabase
    .from("appointment_document_drafts")
    .update({ status: parsed.data.status, updated_by: userData.user.id, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.draftId)
    .eq("matter_id", parsed.data.matterId)
    .select("appointment_document_id")
    .single()
  if (draftError || !draft) return { ok: false, error: draftError?.message ?? "Unable to update this draft." }

  const { data: document, error: documentError } = await supabase
    .from("appointment_documents")
    .select("appointment_id")
    .eq("id", draft.appointment_document_id)
    .eq("matter_id", parsed.data.matterId)
    .single()
  if (documentError || !document) return { ok: false, error: "The appointment linked to this draft could not be found." }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: document.appointment_id }
}

const clientPacketSchema = z.object({
  matterId: z.string().uuid(),
  appointmentId: z.string().uuid(),
})

export type ClientPacketActionResult =
  | { ok: true; appointmentId: string; packetUrl: string; expiresAt: string }
  | { ok: false; error: string }

export async function createAppointmentPacketAction(input: z.input<typeof clientPacketSchema>): Promise<ClientPacketActionResult> {
  const parsed = clientPacketSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That client packet could not be created." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before creating a client packet." }

  const [{ data: appointment, error: appointmentError }, { data: documents, error: documentsError }] = await Promise.all([
    supabase.from("appointments").select("id").eq("id", parsed.data.appointmentId).eq("matter_id", parsed.data.matterId).single(),
    supabase.from("appointment_documents").select("id, name").eq("appointment_id", parsed.data.appointmentId).eq("matter_id", parsed.data.matterId).in("name", ["Intake questionnaire", "Engagement letter"]),
  ])
  if (appointmentError || !appointment) return { ok: false, error: "This appointment is no longer available." }
  if (documentsError) return { ok: false, error: "The client documents could not be loaded." }

  const documentIds = (documents ?? []).map((document) => document.id)
  const { data: drafts, error: draftsError } = documentIds.length
    ? await supabase.from("appointment_document_drafts").select("appointment_document_id, status").in("appointment_document_id", documentIds).eq("matter_id", parsed.data.matterId)
    : { data: [], error: null }
  if (draftsError) return { ok: false, error: "The approved client documents could not be loaded." }
  const finalDocumentNames = new Set((documents ?? []).filter((document) => drafts?.some((draft) => draft.appointment_document_id === document.id && draft.status === "final")).map((document) => document.name))
  if (!finalDocumentNames.has("Intake questionnaire") || !finalDocumentNames.has("Engagement letter")) {
    return { ok: false, error: "Create and approve the intake questionnaire and engagement letter before creating the client packet." }
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: packet, error: packetError } = await supabase
    .from("appointment_packets")
    .upsert({
      matter_id: parsed.data.matterId,
      appointment_id: parsed.data.appointmentId,
      token,
      status: "active",
      expires_at: expiresAt,
      viewed_at: null,
      completed_at: null,
      created_by: userData.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "appointment_id" })
    .select("id, expires_at")
    .single()
  if (packetError || !packet) return { ok: false, error: packetError?.message ?? "Unable to create the client packet." }

  const reminderRows = [
    { kind: "first_reminder", send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
    { kind: "final_reminder", send_at: new Date(Date.parse(expiresAt) - 3 * 24 * 60 * 60 * 1000).toISOString() },
  ]
  const { error: reminderError } = await supabase.from("appointment_packet_reminders").upsert(
    reminderRows.map((reminder) => ({ ...reminder, matter_id: parsed.data.matterId, packet_id: packet.id, status: "planned", updated_at: new Date().toISOString() })),
    { onConflict: "packet_id,kind" }
  )
  if (reminderError) return { ok: false, error: reminderError.message }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: appointment.id, packetUrl: `/prepare/${token}`, expiresAt: packet.expires_at }
}

export async function revokeAppointmentPacketAction(input: z.input<typeof clientPacketSchema>): Promise<MatterPilotActionResult> {
  const parsed = clientPacketSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That client packet could not be revoked." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before revoking a client packet." }

  const { data: packet, error } = await supabase
    .from("appointment_packets")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("appointment_id", parsed.data.appointmentId)
    .eq("matter_id", parsed.data.matterId)
    .eq("status", "active")
    .select("appointment_id")
    .single()
  if (error || !packet) return { ok: false, error: error?.message ?? "No active client packet was found." }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: packet.appointment_id }
}

const appointmentEmailSchema = z.object({
  matterId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  recipient: z.string().trim().email().optional().or(z.literal("")),
  subject: z.string().trim().min(2).max(180),
  body: z.string().trim().min(2).max(12000),
})

async function createAppointmentEmail(input: z.input<typeof appointmentEmailSchema>, status: "draft" | "queued"): Promise<MatterPilotActionResult> {
  const parsed = appointmentEmailSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Add an email subject and message before saving." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before saving client communication." }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, client_email")
    .eq("id", parsed.data.appointmentId)
    .eq("matter_id", parsed.data.matterId)
    .single()
  if (appointmentError || !appointment) return { ok: false, error: "This appointment is no longer available." }

  const recipient = parsed.data.recipient || appointment.client_email || ""
  if (status === "queued" && !recipient) return { ok: false, error: "Add a client email before queuing this message." }

  const { error } = await supabase.from("appointment_communications").insert({
    matter_id: parsed.data.matterId,
    appointment_id: parsed.data.appointmentId,
    channel: "email",
    direction: "outbound",
    status,
    recipient: recipient || null,
    subject: parsed.data.subject,
    body: parsed.data.body,
    created_by: userData.user.id,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: appointment.id }
}

export async function saveAppointmentEmailDraftAction(input: z.input<typeof appointmentEmailSchema>): Promise<MatterPilotActionResult> {
  return createAppointmentEmail(input, "draft")
}

export async function queueAppointmentEmailAction(input: z.input<typeof appointmentEmailSchema>): Promise<MatterPilotActionResult> {
  return createAppointmentEmail(input, "queued")
}

const appointmentCommunicationUpdateSchema = z.object({
  matterId: z.string().uuid(),
  communicationId: z.string().uuid(),
  action: z.enum(["queue", "retry", "cancel"]),
})

export async function updateAppointmentCommunicationAction(input: z.input<typeof appointmentCommunicationUpdateSchema>): Promise<MatterPilotActionResult> {
  const parsed = appointmentCommunicationUpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That communication could not be updated." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before updating client communication." }

  const nextStatus = parsed.data.action === "cancel" ? "cancelled" : "queued"
  const allowedStatuses = parsed.data.action === "retry" ? ["failed", "cancelled"] : parsed.data.action === "cancel" ? ["draft", "queued"] : ["draft"]
  const { data, error } = await supabase
    .from("appointment_communications")
    .update({ status: nextStatus, error_message: null, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.communicationId)
    .eq("matter_id", parsed.data.matterId)
    .in("status", allowedStatuses)
    .select("appointment_id")
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? "That communication is no longer available for this action." }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: data.appointment_id }
}

const appointmentParticipantUpdateSchema = z.object({
  matterId: z.string().uuid(),
  participantId: z.string().uuid(),
  responseStatus: z.enum(["pending", "confirmed", "declined"]),
})

export async function updateAppointmentParticipantAction(input: z.input<typeof appointmentParticipantUpdateSchema>): Promise<MatterPilotActionResult> {
  const parsed = appointmentParticipantUpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That participant could not be updated." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before updating participants." }

  const { data, error } = await supabase
    .from("appointment_participants")
    .update({ response_status: parsed.data.responseStatus })
    .eq("id", parsed.data.participantId)
    .eq("matter_id", parsed.data.matterId)
    .select("appointment_id")
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to update that participant." }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: data.appointment_id }
}

const appointmentConflictUpdateSchema = z.object({
  matterId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  conflictStatus: z.enum(["pending", "clear", "issue"]),
})

export async function updateAppointmentConflictAction(input: z.input<typeof appointmentConflictUpdateSchema>): Promise<MatterPilotActionResult> {
  const parsed = appointmentConflictUpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That conflict status could not be updated." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before updating the conflict check." }

  const { data, error } = await supabase
    .from("appointments")
    .update({ conflict_status: parsed.data.conflictStatus })
    .eq("id", parsed.data.appointmentId)
    .eq("matter_id", parsed.data.matterId)
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to update the conflict check." }

  revalidatePath("/matterpilot")
  return { ok: true, appointmentId: data.id }
}

const intakeReviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["needs_info", "accepted", "declined"]),
  conflictStatus: z.enum(["pending", "clear", "possible_conflict"]),
  reviewerNote: z.string().trim().max(2000).optional(),
})

export async function reviewIntakeRequestAction(input: z.input<typeof intakeReviewSchema>): Promise<MatterPilotActionResult> {
  const parsed = intakeReviewSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Choose a decision and conflict status before saving." }
  if (parsed.data.decision === "accepted" && parsed.data.conflictStatus !== "clear") return { ok: false, error: "An intake request can only be accepted after the conflict check is clear." }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, error: "Please sign in before reviewing intake." }

  const { data: request, error: requestError } = await supabase
    .from("booking_requests")
    .select("id, matter_id, appointment_type_name, requested_start, full_name, email, summary")
    .eq("id", parsed.data.requestId)
    .single()
  if (requestError || !request) return { ok: false, error: "This intake request is no longer available." }

  const { error: reviewError } = await supabase.from("intake_reviews").upsert({
    matter_id: request.matter_id,
    booking_request_id: request.id,
    reviewer_id: userData.user.id,
    decision: parsed.data.decision,
    conflict_status: parsed.data.conflictStatus,
    reviewer_note: parsed.data.reviewerNote || null,
  }, { onConflict: "booking_request_id" })
  if (reviewError) return { ok: false, error: reviewError.message }

  if (parsed.data.decision !== "accepted") {
    const { error: updateError } = await supabase.from("booking_requests").update({ status: parsed.data.decision, reviewed_at: new Date().toISOString() }).eq("id", request.id)
    if (updateError) return { ok: false, error: updateError.message }
    revalidatePath("/matterpilot/intake")
    return { ok: true, appointmentId: request.id }
  }

  const workflow = getWorkflowByLabel(request.appointment_type_name)
  const startsAt = new Date(request.requested_start)
  const endsAt = new Date(startsAt.getTime() + getWorkflowDurationMinutes(workflow.key) * 60 * 1000)
  const { data: appointment, error: appointmentError } = await supabase.from("appointments").insert({
    matter_id: request.matter_id,
    workflow_key: workflow.key,
    title: workflow.defaultTitle,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: "tentative",
    conflict_status: "clear",
    location: workflow.defaultLocation,
    notes: request.summary,
    client_name: request.full_name,
    client_email: request.email,
    created_by: userData.user.id,
  }).select("id").single()
  if (appointmentError || !appointment) return { ok: false, error: appointmentError?.message ?? "Unable to create the appointment from intake." }

  const { error: taskError } = await supabase.from("appointment_tasks").insert(workflow.tasks.map((label) => ({
    matter_id: request.matter_id,
    appointment_id: appointment.id,
    label,
    status: "open",
    is_blocking: true,
    created_by: userData.user.id,
  })))
  if (taskError) return { ok: false, error: taskError.message }

  if (workflow.documents.length) {
    const { error: documentError } = await supabase.from("appointment_documents").insert(workflow.documents.map((name) => ({
      matter_id: request.matter_id,
      appointment_id: appointment.id,
      name,
      status: "requested",
      is_required: true,
      created_by: userData.user.id,
    })))
    if (documentError) return { ok: false, error: documentError.message }
  }

  const { error: participantError } = await supabase.from("appointment_participants").insert({
    matter_id: request.matter_id,
    appointment_id: appointment.id,
    display_name: request.full_name,
    email: request.email,
    participant_role: "client",
    response_status: "pending",
    is_required: true,
  })
  if (participantError) return { ok: false, error: participantError.message }

  const { error: reminderError } = await supabase.from("appointment_reminders").insert([
    { matter_id: request.matter_id, appointment_id: appointment.id, channel: "email", send_at: startsAt.toISOString(), status: "planned" },
    { matter_id: request.matter_id, appointment_id: appointment.id, channel: "email", send_at: new Date(Math.max(Date.now(), startsAt.getTime() - 24 * 60 * 60 * 1000)).toISOString(), status: "planned" },
  ])
  if (reminderError) return { ok: false, error: reminderError.message }

  const { error: updateError } = await supabase.from("booking_requests").update({ status: "accepted", reviewed_at: new Date().toISOString() }).eq("id", request.id)
  if (updateError) return { ok: false, error: updateError.message }

  revalidatePath("/matterpilot")
  revalidatePath("/matterpilot/intake")
  return { ok: true, appointmentId: appointment.id }
}

const bookingSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  appointmentTypeName: z.string().trim().min(2).max(120),
  requestedStart: z.string().datetime(),
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  summary: z.string().trim().max(2000).optional(),
})

export async function submitPublicBookingAction(input: z.input<typeof bookingSchema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Please complete the required booking details." }

  const supabase = await createClient()
  const { error } = await supabase.rpc("submit_public_booking_request", {
    p_slug: parsed.data.slug,
    p_appointment_type_name: parsed.data.appointmentTypeName,
    p_requested_start: parsed.data.requestedStart,
    p_full_name: parsed.data.fullName,
    p_email: parsed.data.email,
    p_summary: parsed.data.summary || null,
  })

  if (error) return { ok: false, error: "This booking link is unavailable. Please contact the firm directly." }
  return { ok: true }
}

const clientPacketSubmissionSchema = z.object({
  token: z.string().trim().min(40).max(160),
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  phone: z.string().trim().max(80).optional(),
  summary: z.string().trim().max(3000).optional(),
  goals: z.string().trim().max(3000).optional(),
  deadlines: z.string().trim().max(1500).optional(),
  engagementAcknowledged: z.boolean(),
})

export async function submitClientPacketAction(input: z.input<typeof clientPacketSubmissionSchema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = clientPacketSubmissionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Please complete the required fields before submitting." }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("submit_appointment_packet", {
    p_token: parsed.data.token,
    p_full_name: parsed.data.fullName,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone || null,
    p_summary: parsed.data.summary || null,
    p_goals: parsed.data.goals || null,
    p_deadlines: parsed.data.deadlines || null,
    p_engagement_acknowledged: parsed.data.engagementAcknowledged,
  })
  if (error) return { ok: false, error: "This preparation link is unavailable. Please contact the firm." }

  const result = data && typeof data === "object" && !Array.isArray(data) ? data as { ok?: boolean; error?: string } : null
  if (!result?.ok) return { ok: false, error: result?.error ?? "The preparation packet could not be submitted." }

  revalidatePath("/matterpilot")
  return { ok: true }
}
