import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DerivedReport } from "@/components/reports/derived-report"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Case-Theory Stress Test" }

export default async function CaseTheoryStressTestPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()
  const [{ data: matter }, { data: propositions }, { data: contradictions }, { data: reviews }, { data: links }] = await Promise.all([
    supabase.from("matters").select("id, name, matter_number, defense_theory, opposing_theory").eq("id", matterId).maybeSingle(),
    supabase.from("propositions").select("id, statement, status, assumptions, next_action").eq("matter_id", matterId).order("created_at", { ascending: true }),
    supabase.from("contradictions").select("id, title, resolution_status, plausible_alternative_explanations, missing_evidence").eq("matter_id", matterId),
    supabase.from("contradiction_reviews").select("contradiction_id, weakest_assumption, opposing_counsel_attack, fact_that_would_weaken_conclusion").eq("matter_id", matterId),
    supabase.from("evidence_links").select("proposition_id, relationship").eq("matter_id", matterId).not("proposition_id", "is", null),
  ])
  if (!matter) notFound()
  const linkCounts = new Map<string, { supports: number; contradicts: number }>()
  for (const link of links ?? []) { if (!link.proposition_id) continue; const count = linkCounts.get(link.proposition_id) ?? { supports: 0, contradicts: 0 }; if (link.relationship === "supports") count.supports += 1; if (link.relationship === "contradicts") count.contradicts += 1; linkCounts.set(link.proposition_id, count) }
  const reviewMap = new Map((reviews ?? []).map((review) => [review.contradiction_id, review]))
  return <DerivedReport title="Case-Theory Stress Test" description="A disciplined challenge to the current theory using contradictory links, unresolved conflicts, assumptions, and recorded attack questions." matterName={matter.name} matterNumber={matter.matter_number} sections={[
    { heading: "Current theory", body: `Defense theory: ${matter.defense_theory || "not recorded"}. Opposing theory: ${matter.opposing_theory || "not recorded"}.` },
    { heading: "Propositions under pressure", items: (propositions ?? []).map((item) => { const count = linkCounts.get(item.id) ?? { supports: 0, contradicts: 0 }; return { label: item.statement, detail: `${count.supports} supporting link(s) · ${count.contradicts} contradicting link(s) · status ${item.status}${item.assumptions ? ` · assumption: ${item.assumptions}` : ""}${item.next_action ? ` · next: ${item.next_action}` : ""}`, tone: count.contradicts > 0 || count.supports === 0 ? "warn" as const : "normal" as const } }) },
    { heading: "Unresolved contradictions", items: (contradictions ?? []).filter((item) => item.resolution_status !== "resolved_a" && item.resolution_status !== "resolved_b").map((item) => { const review = reviewMap.get(item.id); return { label: item.title, detail: `${item.resolution_status}${item.plausible_alternative_explanations ? ` · alternatives: ${item.plausible_alternative_explanations}` : ""}${item.missing_evidence ? ` · missing: ${item.missing_evidence}` : ""}${review?.weakest_assumption ? ` · weakest assumption: ${review.weakest_assumption}` : ""}${review?.opposing_counsel_attack ? ` · opposing attack: ${review.opposing_counsel_attack}` : ""}`, tone: "warn" as const } }) },
  ]} />
}
