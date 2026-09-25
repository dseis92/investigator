import type { Metadata } from "next"

import { OperationsCenter } from "@/components/matterpilot/operations-center"
import { isCalendarProviderConfigured } from "@/lib/calendar/oauth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "MatterPilot Operations" }

export default async function MatterPilotOperationsPage({ searchParams }: { searchParams?: Promise<{ calendar?: string | string[] }> }) {
  const params = searchParams ? await searchParams : {}
  const calendarParam = Array.isArray(params.calendar) ? params.calendar[0] : params.calendar
  const calendarNotice = ["connected", "error", "cancelled"].includes(calendarParam ?? "") ? calendarParam as "connected" | "error" | "cancelled" : undefined
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data: matters } = await supabase.from("matters").select("id, name, matter_number").order("updated_at", { ascending: false }).limit(100)
  const matterIds = (matters ?? []).map((matter) => matter.id)
  const matterNames = new Map((matters ?? []).map((matter) => [matter.id, matter.name]))
  const [{ data: templates }, { data: appointments }, { data: notifications }, { data: rules }, { data: connections }, { data: timeEntries }, { data: invoices }, { data: activity }, { data: aiRuns }] = await Promise.all([
    matterIds.length ? supabase.from("appointment_task_templates").select("id, matter_id, label, frequency, interval_count, is_blocking, assigned_to, next_run_at, active").in("matter_id", matterIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    matterIds.length ? supabase.from("appointments").select("id, matter_id, title, starts_at").in("matter_id", matterIds).neq("status", "cancelled").order("starts_at", { ascending: true }).limit(200) : Promise.resolve({ data: [] }),
    matterIds.length ? supabase.from("matter_notifications").select("id, matter_id, kind, title, body, href, read_at, created_at").in("matter_id", matterIds).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    supabase.from("court_rule_definitions").select("id, name, jurisdiction, trigger_kind, offset_days, business_days, description").eq("active", true).order("jurisdiction", { ascending: true }).order("name", { ascending: true }),
    supabase.from("calendar_sync_connections").select("id, provider, matter_id, status, provider_account_email, calendar_name, last_sync_at, error_message").eq("user_id", userData.user.id),
    matterIds.length ? supabase.from("time_entries").select("id, matter_id, description, duration_minutes, rate_cents, status, created_at").in("matter_id", matterIds).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    matterIds.length ? supabase.from("billing_invoices").select("id, matter_id, invoice_number, status, subtotal_cents, issued_at, due_at").in("matter_id", matterIds).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    matterIds.length ? supabase.from("audit_events").select("id, matter_id, action, entity_type, summary, created_at").in("matter_id", matterIds).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    matterIds.length ? supabase.from("ai_assistance_runs").select("id, matter_id, run_type, status, model, output, created_at").in("matter_id", matterIds).order("created_at", { ascending: false }).limit(40) : Promise.resolve({ data: [] }),
  ])

  return <OperationsCenter
    matters={matters ?? []}
    templates={(templates ?? []).map((template) => ({ id: template.id, matterId: template.matter_id, matter: matterNames.get(template.matter_id) ?? "Matter", label: template.label, frequency: template.frequency, intervalCount: template.interval_count, isBlocking: template.is_blocking, assignedTo: template.assigned_to, nextRunAt: template.next_run_at, active: template.active }))}
    appointments={(appointments ?? []).map((appointment) => ({ id: appointment.id, matterId: appointment.matter_id, title: appointment.title, startsAt: appointment.starts_at }))}
    notifications={(notifications ?? []).map((notification) => ({ id: notification.id, matterId: notification.matter_id, matter: matterNames.get(notification.matter_id) ?? "Matter", kind: notification.kind, title: notification.title, body: notification.body, href: notification.href, readAt: notification.read_at, createdAt: notification.created_at }))}
    rules={(rules ?? []).map((rule) => ({ id: rule.id, name: rule.name, jurisdiction: rule.jurisdiction, triggerKind: rule.trigger_kind, offsetDays: rule.offset_days, businessDays: rule.business_days, description: rule.description }))}
    connections={(connections ?? []).map((connection) => ({ id: connection.id, provider: connection.provider as "google" | "outlook", matterId: connection.matter_id, matter: matterNames.get(connection.matter_id ?? "") ?? "Matter", status: connection.status, email: connection.provider_account_email, calendarName: connection.calendar_name, lastSyncAt: connection.last_sync_at, errorMessage: connection.error_message }))}
    calendarReady={{ google: isCalendarProviderConfigured("google"), outlook: isCalendarProviderConfigured("outlook") }}
    timeEntries={(timeEntries ?? []).map((entry) => ({ id: entry.id, matterId: entry.matter_id, matter: matterNames.get(entry.matter_id) ?? "Matter", description: entry.description, durationMinutes: entry.duration_minutes, rateCents: entry.rate_cents, status: entry.status, createdAt: entry.created_at }))}
    invoices={(invoices ?? []).map((invoice) => ({ id: invoice.id, matterId: invoice.matter_id, matter: matterNames.get(invoice.matter_id) ?? "Matter", invoiceNumber: invoice.invoice_number, status: invoice.status, subtotalCents: invoice.subtotal_cents, issuedAt: invoice.issued_at, dueAt: invoice.due_at }))}
    activity={(activity ?? []).map((entry) => ({ id: entry.id, matter: matterNames.get(entry.matter_id) ?? "Matter", action: entry.action, entityType: entry.entity_type, summary: entry.summary, createdAt: entry.created_at }))}
    aiRuns={(aiRuns ?? []).map((run) => ({ id: run.id, matterId: run.matter_id, matter: matterNames.get(run.matter_id) ?? "Matter", runType: run.run_type, status: run.status, model: run.model, output: (run.output ?? {}) as { headline?: string; summary?: string; priorities?: string[]; risks?: string[]; questions?: string[]; citedRecords?: string[] }, createdAt: run.created_at }))}
    aiConfigured={Boolean(process.env.OPENAI_API_KEY)}
    calendarNotice={calendarNotice}
  />
}
