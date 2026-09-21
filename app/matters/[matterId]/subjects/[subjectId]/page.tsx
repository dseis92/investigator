import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { MatterHeader } from "@/components/matters/matter-header"
import { AttributeTable, type AttributeWithEvidence } from "@/components/subjects/attribute-table"
import { SubjectTypeIcon } from "@/components/subjects/subject-type-icon"
import { Card, CardContent } from "@/components/ui/card"
import { humanizeEnum } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subjectId: string }>
}): Promise<Metadata> {
  const { subjectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("subjects").select("display_name").eq("id", subjectId).maybeSingle()
  return { title: data?.display_name ?? "Subject" }
}

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ matterId: string; subjectId: string }>
}) {
  const { matterId, subjectId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const { data: subject } = await supabase.from("subjects").select("*").eq("id", subjectId).eq("matter_id", matterId).maybeSingle()
  if (!subject) notFound()

  const [{ data: attributes }, { data: evidence }] = await Promise.all([
    supabase
      .from("entity_attributes")
      .select("*, evidence:evidence!entity_attributes_evidence_matter_fkey(id, evidence_number, title)")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("evidence")
      .select("id, evidence_number, title")
      .eq("matter_id", matterId)
      .eq("is_excluded", false)
      .order("evidence_number", { ascending: true }),
  ])

  const evidenceOptions = (evidence ?? []).map((e) => ({ id: e.id, evidence_number: e.evidence_number, title: e.title }))

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section={subject.display_name} />

      <Card>
        <CardContent className="flex items-start gap-3">
          <SubjectTypeIcon type={subject.subject_type} className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-base font-medium">{subject.display_name}</p>
            <p className="text-sm text-muted-foreground">{humanizeEnum(subject.subject_type)}</p>
            {subject.summary ? <p className="mt-2 text-sm">{subject.summary}</p> : null}
          </div>
        </CardContent>
      </Card>

      <AttributeTable
        matterId={matterId}
        subjectId={subjectId}
        attributes={(attributes ?? []) as unknown as AttributeWithEvidence[]}
        evidenceOptions={evidenceOptions}
      />
    </div>
  )
}
