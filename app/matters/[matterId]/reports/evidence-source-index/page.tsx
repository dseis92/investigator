import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DerivedReport } from "@/components/reports/derived-report"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Evidence / Source Index" }

export default async function EvidenceSourceIndexPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()
  const [{ data: matter }, { data: evidence }] = await Promise.all([
    supabase.from("matters").select("id, name, matter_number").eq("id", matterId).maybeSingle(),
    supabase.from("evidence").select("evidence_number, title, artifact_type, source_locator, event_date, provenance_status, authentication_status").eq("matter_id", matterId).order("evidence_number", { ascending: true }),
  ])
  if (!matter) notFound()
  const grouped = new Map<string, NonNullable<typeof evidence>>()
  for (const item of evidence ?? []) {
    const key = item.source_locator?.split(":")[0] || "Source not recorded"
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }
  return <DerivedReport title="Evidence / Source Index" description="The matter evidence ledger grouped by source locator, with provenance and authentication states preserved for review." matterName={matter.name} matterNumber={matter.matter_number} matterId={matterId} reportType="evidence-source-index" sections={[...grouped.entries()].map(([source, items]) => ({ heading: source, items: items.map((item) => ({ label: `${item.evidence_number} · ${item.title}`, detail: `${item.artifact_type} · ${item.event_date ? new Date(item.event_date).toLocaleDateString() : "Date not recorded"} · locator ${item.source_locator ?? "not recorded"} · provenance ${item.provenance_status} · authentication ${item.authentication_status}`, tone: item.provenance_status === "weak" || item.authentication_status === "unverified" ? "warn" as const : "normal" as const })) }))} />
}
