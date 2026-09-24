import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DerivedReport, type DerivedReportSection } from "@/components/reports/derived-report"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Master Chronology" }

export default async function MasterChronologyPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()
  const [{ data: matter }, { data: events }, { data: evidence }, { data: statements }, { data: deadlines }, { data: appointments }] = await Promise.all([
    supabase.from("matters").select("id, name, matter_number").eq("id", matterId).maybeSingle(),
    supabase.from("events").select("title, description, event_start, category, confidence").eq("matter_id", matterId).order("event_start", { ascending: true }),
    supabase.from("evidence").select("evidence_number, title, event_date, source_locator, provenance_status").eq("matter_id", matterId).order("event_date", { ascending: true }),
    supabase.from("statements").select("content, statement_date, status, subject:subjects!statements_subject_matter_fkey(display_name)").eq("matter_id", matterId).order("statement_date", { ascending: true }),
    supabase.from("matter_deadlines").select("title, due_at, kind, status, priority").eq("matter_id", matterId).order("due_at", { ascending: true }),
    supabase.from("appointments").select("title, starts_at, ends_at, status, client_name").eq("matter_id", matterId).neq("status", "cancelled").order("starts_at", { ascending: true }),
  ])
  if (!matter) notFound()
  const rows = [
    ...(events ?? []).map((event) => ({ date: event.event_start, label: event.title, detail: `${event.category ?? "event"} · ${event.confidence}${event.description ? ` · ${event.description}` : ""}`, tone: event.confidence === "disputed" ? "warn" as const : "normal" as const })),
    ...(evidence ?? []).filter((item) => item.event_date).map((item) => ({ date: item.event_date as string, label: `${item.evidence_number} · ${item.title}`, detail: `Evidence record · ${item.source_locator ?? "Source locator not recorded"} · provenance ${item.provenance_status}`, tone: "normal" as const })),
    ...(statements ?? []).filter((item) => item.statement_date).map((item) => ({ date: item.statement_date as string, label: `${(item.subject as { display_name: string } | null)?.display_name ?? "Statement"}`, detail: `${item.content} · ${item.status}`, tone: item.status === "disputed" ? "warn" as const : "normal" as const })),
    ...(deadlines ?? []).map((deadline) => ({ date: deadline.due_at, label: `Deadline · ${deadline.title}`, detail: `${deadline.kind} · ${deadline.priority} priority · ${deadline.status}`, tone: deadline.status === "missed" ? "warn" as const : "normal" as const })),
    ...(appointments ?? []).map((appointment) => ({ date: appointment.starts_at, label: `Appointment · ${appointment.title}`, detail: `${appointment.client_name ?? "No client recorded"} · ${appointment.status}${appointment.ends_at ? ` · ends ${new Date(appointment.ends_at).toLocaleString()}` : ""}`, tone: "normal" as const })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const sections: DerivedReportSection[] = [{ heading: "Chronology", body: rows.length ? "Records are ordered by their recorded date or scheduled start. Same-day conflicts and missing dates remain visible in the underlying record." : "No dated records exist for this matter yet.", items: rows.map((row) => ({ label: new Date(row.date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }), detail: `${row.label} — ${row.detail}`, tone: row.tone })) }]
  return <DerivedReport title="Master Chronology" description="A single chronological view of events, evidence, statements, deadlines, and appointments recorded in the matter." matterName={matter.name} matterNumber={matter.matter_number} sections={sections} />
}
