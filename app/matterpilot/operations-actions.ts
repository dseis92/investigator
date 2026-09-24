"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { generateOperationsInsight } from "@/lib/ai/operations-insights"
import { logAuditEvent } from "@/lib/audit/log-audit-event"
import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"

type OperationResult = { ok: true; id?: string; message?: string } | { ok: false; error: string }

const taskTemplateSchema = z.object({
  matterId: z.string().uuid(),
  label: z.string().trim().min(2).max(180),
  frequency: z.enum(["weekly", "monthly", "after_appointment"]),
  intervalCount: z.number().int().min(1).max(52),
  isBlocking: z.boolean(),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
  nextRunAt: z.string().datetime().optional().or(z.literal("")),
})

export async function createTaskTemplateAction(input: z.input<typeof taskTemplateSchema>): Promise<OperationResult> {
  const parsed = taskTemplateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Enter a recurring task and schedule." }
  const user = await requireCurrentUser()
  const supabase = await createClient()
  if (parsed.data.assignedTo) {
    const { data: member } = await supabase.from("matter_members").select("user_id").eq("matter_id", parsed.data.matterId).eq("user_id", parsed.data.assignedTo).maybeSingle()
    if (!member) return { ok: false, error: "The task owner must be a member of this matter." }
  }
  const { data, error } = await supabase.from("appointment_task_templates").insert({
    matter_id: parsed.data.matterId,
    label: parsed.data.label,
    frequency: parsed.data.frequency,
    interval_count: parsed.data.intervalCount,
    is_blocking: parsed.data.isBlocking,
    assigned_to: parsed.data.assignedTo || null,
    next_run_at: parsed.data.nextRunAt || new Date().toISOString(),
    created_by: user.id,
  }).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to save the recurring task." }
  await logAuditEvent({ matterId: parsed.data.matterId, entityType: "appointment_task_template", entityId: data.id, action: "create", summary: `Created recurring task: ${parsed.data.label}` })
  revalidatePath("/matterpilot/operations")
  return { ok: true, id: data.id }
}

const materializeTaskSchema = z.object({ matterId: z.string().uuid(), templateId: z.string().uuid(), appointmentId: z.string().uuid() })

export async function materializeTaskTemplateAction(input: z.input<typeof materializeTaskSchema>): Promise<OperationResult> {
  const parsed = materializeTaskSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Choose a recurring task and appointment." }
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const [{ data: template }, { data: appointment }] = await Promise.all([
    supabase.from("appointment_task_templates").select("id, label, is_blocking, assigned_to, frequency, interval_count, next_run_at").eq("id", parsed.data.templateId).eq("matter_id", parsed.data.matterId).single(),
    supabase.from("appointments").select("id").eq("id", parsed.data.appointmentId).eq("matter_id", parsed.data.matterId).single(),
  ])
  if (!template || !appointment) return { ok: false, error: "That recurring task or appointment is no longer available." }
  const { data: task, error } = await supabase.from("appointment_tasks").insert({
    matter_id: parsed.data.matterId,
    appointment_id: parsed.data.appointmentId,
    label: template.label,
    is_blocking: template.is_blocking,
    assigned_to: template.assigned_to,
    created_by: user.id,
  }).select("id").single()
  if (error || !task) return { ok: false, error: error?.message ?? "Unable to add the recurring task to that appointment." }
  const nextRun = template.next_run_at ? new Date(template.next_run_at) : new Date()
  if (template.frequency === "weekly") nextRun.setDate(nextRun.getDate() + template.interval_count * 7)
  if (template.frequency === "monthly") nextRun.setMonth(nextRun.getMonth() + template.interval_count)
  await supabase.from("appointment_task_templates").update({ next_run_at: nextRun.toISOString(), updated_at: new Date().toISOString() }).eq("id", template.id).eq("matter_id", parsed.data.matterId)
  await logAuditEvent({ matterId: parsed.data.matterId, entityType: "appointment_task", entityId: task.id, action: "create", summary: `Materialized recurring task: ${template.label}` })
  revalidatePath("/matterpilot")
  revalidatePath("/matterpilot/operations")
  return { ok: true, id: task.id }
}

export async function markNotificationReadAction(input: { notificationId: string; matterId: string }): Promise<OperationResult> {
  if (!z.string().uuid().safeParse(input.notificationId).success || !z.string().uuid().safeParse(input.matterId).success) return { ok: false, error: "Notification not found." }
  await requireCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.from("matter_notifications").update({ read_at: new Date().toISOString() }).eq("id", input.notificationId).eq("matter_id", input.matterId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/matterpilot/operations")
  return { ok: true }
}

export async function refreshNotificationQueueAction(): Promise<OperationResult> {
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data: memberships } = await supabase.from("matter_members").select("matter_id").eq("user_id", user.id)
  const matterIds = (memberships ?? []).map((membership) => membership.matter_id)
  if (!matterIds.length) return { ok: true, message: "No matter notifications to refresh." }
  const now = new Date().toISOString()
  const [{ data: tasks }, { data: deadlines }, { data: matters }] = await Promise.all([
    supabase.from("appointment_tasks").select("id, matter_id, label, due_at").in("matter_id", matterIds).eq("status", "open").not("due_at", "is", null).lt("due_at", now),
    supabase.from("matter_deadlines").select("id, matter_id, title, due_at").in("matter_id", matterIds).eq("status", "open").lt("due_at", now),
    supabase.from("matters").select("id, name").in("id", matterIds),
  ])
  const matterNames = new Map((matters ?? []).map((matter) => [matter.id, matter.name]))
  const candidates = [
    ...(tasks ?? []).map((task) => ({ matterId: task.matter_id, kind: "task_due", title: `Overdue task: ${task.label}`, body: `${matterNames.get(task.matter_id) ?? "Matter"} has an open task past its due date.`, href: "/matterpilot#tasks", dedupeKey: `task_due:${task.id}` })),
    ...(deadlines ?? []).map((deadline) => ({ matterId: deadline.matter_id, kind: "deadline_due", title: `Missed deadline: ${deadline.title}`, body: `${matterNames.get(deadline.matter_id) ?? "Matter"} has an open deadline past its due date.`, href: "/matterpilot#deadlines", dedupeKey: `deadline_due:${deadline.id}` })),
  ]
  for (const candidate of candidates) {
    const { data: existing } = await supabase.from("matter_notifications").select("id").eq("recipient_id", user.id).eq("dedupe_key", candidate.dedupeKey).maybeSingle()
    if (!existing) await supabase.from("matter_notifications").insert({ matter_id: candidate.matterId, recipient_id: user.id, kind: candidate.kind, title: candidate.title, body: candidate.body, href: candidate.href, dedupe_key: candidate.dedupeKey })
  }
  revalidatePath("/matterpilot/operations")
  return { ok: true, message: candidates.length ? `Refreshed ${candidates.length} overdue notification${candidates.length === 1 ? "" : "s"}.` : "No overdue work found." }
}

const courtRuleSchema = z.object({
  name: z.string().trim().min(2).max(160),
  jurisdiction: z.string().trim().min(2).max(120),
  triggerKind: z.enum(["filing", "service", "court_order", "hearing", "custom"]),
  offsetDays: z.number().int().min(-3650).max(3650),
  businessDays: z.boolean(),
  description: z.string().trim().max(500).optional(),
})

export async function createCourtRuleAction(input: z.input<typeof courtRuleSchema>): Promise<OperationResult> {
  const parsed = courtRuleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Enter the court rule name, jurisdiction, and offset." }
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase.from("court_rule_definitions").insert({
    name: parsed.data.name,
    jurisdiction: parsed.data.jurisdiction,
    trigger_kind: parsed.data.triggerKind,
    offset_days: parsed.data.offsetDays,
    business_days: parsed.data.businessDays,
    description: parsed.data.description || null,
    created_by: user.id,
  }).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to save the court rule." }
  revalidatePath("/matterpilot/operations")
  return { ok: true, id: data.id }
}

function calculateDueDate(triggerAt: string, offsetDays: number, businessDays: boolean) {
  const date = new Date(triggerAt)
  const direction = offsetDays < 0 ? -1 : 1
  let remaining = Math.abs(offsetDays)
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + direction)
    if (!businessDays || (date.getUTCDay() !== 0 && date.getUTCDay() !== 6)) remaining -= 1
  }
  return date
}

const deadlineRuleSchema = z.object({
  matterId: z.string().uuid(),
  ruleId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  triggerAt: z.string().datetime(),
  kind: z.enum(["court_date", "filing", "discovery", "client", "internal", "other"]),
  priority: z.enum(["normal", "high", "critical"]),
  notes: z.string().trim().max(2000).optional(),
})

export async function calculateCourtDeadlineAction(input: z.input<typeof deadlineRuleSchema>): Promise<OperationResult> {
  const parsed = deadlineRuleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Choose a rule, trigger date, and deadline title." }
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data: rule } = await supabase.from("court_rule_definitions").select("id, name, offset_days, business_days").eq("id", parsed.data.ruleId).eq("active", true).maybeSingle()
  if (!rule) return { ok: false, error: "That court rule is no longer active." }
  const dueAt = calculateDueDate(parsed.data.triggerAt, rule.offset_days, rule.business_days)
  const calculationNote = `${rule.name}: ${rule.offset_days >= 0 ? `${rule.offset_days} day${rule.offset_days === 1 ? "" : "s"} after` : `${Math.abs(rule.offset_days)} day${Math.abs(rule.offset_days) === 1 ? "" : "s"} before`} trigger; ${rule.business_days ? "business days" : "calendar days"}.`
  const { data, error } = await supabase.from("matter_deadlines").insert({
    matter_id: parsed.data.matterId,
    title: parsed.data.title,
    kind: parsed.data.kind,
    due_at: dueAt.toISOString(),
    priority: parsed.data.priority,
    status: "open",
    notes: parsed.data.notes || null,
    court_rule_id: rule.id,
    trigger_at: parsed.data.triggerAt,
    calculation_note: calculationNote,
    created_by: user.id,
  }).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to create the calculated deadline." }
  await logAuditEvent({ matterId: parsed.data.matterId, entityType: "matter_deadline", entityId: data.id, action: "create", summary: `Calculated deadline: ${parsed.data.title}` })
  revalidatePath("/matterpilot")
  revalidatePath("/matterpilot/operations")
  return { ok: true, id: data.id, message: `Calculated for ${dueAt.toLocaleDateString("en-US")}.` }
}

const timeEntrySchema = z.object({
  matterId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().trim().min(2).max(240),
  durationMinutes: z.number().int().min(1).max(1440),
  rateCents: z.number().int().min(0).max(1000000),
  billable: z.boolean(),
})

export async function createTimeEntryAction(input: z.input<typeof timeEntrySchema>): Promise<OperationResult> {
  const parsed = timeEntrySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Enter a description, duration, and rate." }
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase.from("time_entries").insert({
    matter_id: parsed.data.matterId,
    user_id: user.id,
    appointment_id: parsed.data.appointmentId || null,
    description: parsed.data.description,
    duration_minutes: parsed.data.durationMinutes,
    rate_cents: parsed.data.rateCents,
    billable: parsed.data.billable,
    status: "submitted",
    created_by: user.id,
  }).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to save the time entry." }
  await logAuditEvent({ matterId: parsed.data.matterId, entityType: "time_entry", entityId: data.id, action: "create", summary: `Recorded ${parsed.data.durationMinutes} minutes: ${parsed.data.description}` })
  revalidatePath("/matterpilot/operations")
  return { ok: true, id: data.id }
}

const invoiceSchema = z.object({ matterId: z.string().uuid(), invoiceNumber: z.string().trim().min(2).max(40), dueAt: z.string().optional(), timeEntryIds: z.array(z.string().uuid()).min(1) })

export async function createInvoiceAction(input: z.input<typeof invoiceSchema>): Promise<OperationResult> {
  const parsed = invoiceSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Select at least one billable time entry and an invoice number." }
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data: entries } = await supabase.from("time_entries").select("id, description, duration_minutes, rate_cents, status").eq("matter_id", parsed.data.matterId).in("id", parsed.data.timeEntryIds).eq("status", "submitted")
  if (!entries?.length) return { ok: false, error: "Those time entries are no longer available to invoice." }
  const subtotalCents = entries.reduce((sum, entry) => sum + Math.round(entry.duration_minutes * entry.rate_cents / 60), 0)
  const { data: invoice, error } = await supabase.from("billing_invoices").insert({
    matter_id: parsed.data.matterId,
    invoice_number: parsed.data.invoiceNumber,
    status: "draft",
    issued_at: new Date().toISOString().slice(0, 10),
    due_at: parsed.data.dueAt || null,
    subtotal_cents: subtotalCents,
    created_by: user.id,
  }).select("id").single()
  if (error || !invoice) return { ok: false, error: error?.code === "23505" ? "That invoice number already exists for this matter." : error?.message ?? "Unable to create the invoice." }
  const { error: itemError } = await supabase.from("billing_invoice_items").insert(entries.map((entry) => ({ matter_id: parsed.data.matterId, invoice_id: invoice.id, time_entry_id: entry.id, description: entry.description, quantity_minutes: entry.duration_minutes, rate_cents: entry.rate_cents })))
  if (itemError) return { ok: false, error: itemError.message }
  await supabase.from("time_entries").update({ status: "invoiced", updated_at: new Date().toISOString() }).eq("matter_id", parsed.data.matterId).in("id", entries.map((entry) => entry.id))
  await logAuditEvent({ matterId: parsed.data.matterId, entityType: "billing_invoice", entityId: invoice.id, action: "create", summary: `Created invoice ${parsed.data.invoiceNumber}` })
  revalidatePath("/matterpilot/operations")
  return { ok: true, id: invoice.id }
}

export async function requestCalendarConnectionAction(provider: "google" | "outlook"): Promise<OperationResult> {
  const user = await requireCurrentUser()
  const configured = provider === "google" ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) : Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
  if (!configured) return { ok: false, error: `${provider === "google" ? "Google" : "Outlook"} credentials are not configured yet. Add the provider client ID and secret before connecting.` }
  const supabase = await createClient()
  const { data, error } = await supabase.from("calendar_sync_connections").upsert({ provider, user_id: user.id, status: "pending", updated_at: new Date().toISOString() }, { onConflict: "provider,user_id,matter_id" }).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to start calendar connection." }
  revalidatePath("/matterpilot/operations")
  return { ok: true, id: data.id, message: "Connection request recorded. Complete the provider OAuth step when credentials are configured." }
}

export async function runMatterAiInsightAction(input: { matterId: string; runType: "matter_brief" | "evidence_summary" | "contradiction_scan" | "timeline_gap_scan" | "missing_document_scan" | "deposition_questions" }): Promise<OperationResult> {
  if (!z.string().uuid().safeParse(input.matterId).success) return { ok: false, error: "Matter not found." }
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data: matter } = await supabase.from("matters").select("id, name, matter_number, case_mode, status").eq("id", input.matterId).maybeSingle()
  if (!matter) return { ok: false, error: "Matter not found." }
  const [{ data: deadlines }, { data: tasks }, { data: contacts }, { data: appointments }, { data: events }] = await Promise.all([
    supabase.from("matter_deadlines").select("title, kind, due_at, priority, status").eq("matter_id", input.matterId).order("due_at", { ascending: true }).limit(30),
    supabase.from("appointment_tasks").select("label, status, is_blocking, due_at").eq("matter_id", input.matterId).limit(50),
    supabase.from("matter_contacts").select("display_name, contact_type").eq("matter_id", input.matterId).limit(50),
    supabase.from("appointments").select("title, starts_at, status, client_name").eq("matter_id", input.matterId).order("starts_at", { ascending: true }).limit(30),
    supabase.from("events").select("title, event_start, category").eq("matter_id", input.matterId).order("event_start", { ascending: true }).limit(50),
  ])
  try {
    const generated = await generateOperationsInsight({ runType: input.runType, matter, deadlines: deadlines ?? [], tasks: tasks ?? [], contacts: contacts ?? [], appointments: appointments ?? [], events: events ?? [] })
    const { data: run, error } = await supabase.from("ai_assistance_runs").insert({ matter_id: input.matterId, run_type: input.runType, status: "draft", model: generated.model, prompt_version: "operations-v1", output: generated.output, redaction_applied: true, created_by: user.id }).select("id").single()
    if (error || !run) return { ok: false, error: error?.message ?? "Unable to save the AI draft." }
    await logAuditEvent({ matterId: input.matterId, entityType: "ai_assistance_run", entityId: run.id, action: "create", summary: `Generated AI ${input.runType.replaceAll("_", " ")} draft` })
    revalidatePath("/matterpilot/operations")
    return { ok: true, id: run.id }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "AI generation failed. Check the AI provider configuration." }
  }
}

export async function reviewAiInsightAction(input: { matterId: string; runId: string; status: "under_review" | "approved" | "rejected" }): Promise<OperationResult> {
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase.from("ai_assistance_runs").update({ status: input.status, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq("id", input.runId).eq("matter_id", input.matterId).select("id").single()
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to update the AI review state." }
  revalidatePath("/matterpilot/operations")
  return { ok: true, id: data.id }
}
