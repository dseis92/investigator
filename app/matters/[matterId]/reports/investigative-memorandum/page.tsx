import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DerivedReport } from "@/components/reports/derived-report"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Investigative Memorandum" }

export default async function InvestigativeMemorandumPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()
  const [{ data: matter }, { data: questions }, { data: propositions }, { data: leads }, { data: contradictions }, { data: analyses }] = await Promise.all([
    supabase.from("matters").select("id, name, matter_number, status, defense_theory, opposing_theory").eq("id", matterId).maybeSingle(),
    supabase.from("questions").select("prompt, status").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("propositions").select("statement, status, next_action").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("leads").select("description, status, assigned_to").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("contradictions").select("title, resolution_status, missing_evidence").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("analyses").select("title, summary, status, recommended_next_steps").eq("matter_id", matterId).order("created_at", { ascending: false }).limit(20),
  ])
  if (!matter) notFound()
  return <DerivedReport title="Investigative Memorandum" description="A structured, neutral memorandum assembled from questions, propositions, leads, contradictions, and reviewed analysis records. It is a working draft, not a final legal position." matterName={matter.name} matterNumber={matter.matter_number} sections={[
    { heading: "Matter posture", body: `${matter.status} matter. Defense theory: ${matter.defense_theory || "not recorded"}. Opposing theory: ${matter.opposing_theory || "not recorded"}.` },
    { heading: "Open questions", items: (questions ?? []).map((item) => ({ label: item.prompt, detail: `Status: ${item.status}`, tone: item.status === "open" ? "warn" as const : "normal" as const })) },
    { heading: "Propositions and next actions", items: (propositions ?? []).map((item) => ({ label: item.statement, detail: `${item.status}${item.next_action ? ` · next action: ${item.next_action}` : ""}`, tone: item.status === "disputed" ? "warn" as const : "normal" as const })) },
    { heading: "Leads requiring work", items: (leads ?? []).map((item) => ({ label: item.description, detail: `${item.status}${item.assigned_to ? " · assigned" : " · unassigned"}`, tone: item.status === "open" ? "warn" as const : "normal" as const })) },
    { heading: "Contradictions and limitations", items: (contradictions ?? []).map((item) => ({ label: item.title, detail: `${item.resolution_status}${item.missing_evidence ? ` · missing evidence: ${item.missing_evidence}` : ""}`, tone: item.resolution_status === "unresolved" ? "warn" as const : "normal" as const })) },
    { heading: "Analysis drafts", items: (analyses ?? []).map((item) => ({ label: item.title, detail: `${item.status} · ${item.summary}${item.recommended_next_steps ? ` · next: ${item.recommended_next_steps}` : ""}`, tone: item.status === "final" ? "good" as const : "normal" as const })) },
  ]} />
}
