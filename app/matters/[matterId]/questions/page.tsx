import { HelpCircle } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AddQuestionForm } from "@/components/questions/add-question-form"
import { QuestionCard } from "@/components/questions/question-card"
import { EmptyState } from "@/components/empty-state"
import { MatterHeader } from "@/components/matters/matter-header"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Questions" }

export default async function QuestionsPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const [{ data: questions }, { data: propositions }, { data: links }, { data: evidence }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, prompt, priority, status, owner:profiles!questions_owner_id_fkey(full_name)")
      .eq("matter_id", matterId)
      .order("created_at", { ascending: true }),
    supabase
      .from("propositions")
      .select("id, question_id, statement, status, assumptions, next_action")
      .eq("matter_id", matterId)
      .order("created_at", { ascending: true }),
    supabase
      .from("evidence_links")
      .select("id, proposition_id, relationship, evidence:evidence(id, evidence_number, title)")
      .eq("matter_id", matterId)
      .not("proposition_id", "is", null),
    supabase
      .from("evidence")
      .select("id, evidence_number, title")
      .eq("matter_id", matterId)
      .eq("is_excluded", false)
      .order("evidence_number", { ascending: true }),
  ])

  const linksByProposition = new Map<string, typeof links>()
  for (const link of links ?? []) {
    if (!link.proposition_id) continue
    const list = linksByProposition.get(link.proposition_id) ?? []
    list.push(link)
    linksByProposition.set(link.proposition_id, list)
  }

  const propositionsByQuestion = new Map<string, typeof propositions>()
  for (const p of propositions ?? []) {
    const list = propositionsByQuestion.get(p.question_id) ?? []
    list.push(p)
    propositionsByQuestion.set(p.question_id, list)
  }

  const evidenceOptions = (evidence ?? []).map((e) => ({ id: e.id, evidence_number: e.evidence_number, title: e.title }))

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Questions" />

      <AddQuestionForm matterId={matterId} />

      {questions && questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((q) => {
            const questionPropositions = (propositionsByQuestion.get(q.id) ?? []).map((p) => {
              const propLinks = linksByProposition.get(p.id) ?? []
              return {
                id: p.id,
                statement: p.statement,
                status: p.status,
                assumptions: p.assumptions,
                next_action: p.next_action,
                supportingEvidence: propLinks
                  .filter((l) => l.relationship === "supports" && l.evidence)
                  .map((l) => l.evidence as unknown as { id: string; evidence_number: string; title: string }),
                contradictingEvidence: propLinks
                  .filter((l) => l.relationship === "contradicts" && l.evidence)
                  .map((l) => l.evidence as unknown as { id: string; evidence_number: string; title: string }),
                otherLinkCount: propLinks.filter((l) => !["supports", "contradicts"].includes(l.relationship)).length,
              }
            })

            return (
              <QuestionCard
                key={q.id}
                matterId={matterId}
                question={{
                  id: q.id,
                  prompt: q.prompt,
                  priority: q.priority,
                  status: q.status,
                  ownerName: (q.owner as { full_name: string | null } | null)?.full_name ?? null,
                }}
                propositions={questionPropositions}
                evidenceOptions={evidenceOptions}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={HelpCircle}
          title="No investigative questions yet"
          description="Start by adding the questions this matter needs to answer."
        />
      )}
    </div>
  )
}
