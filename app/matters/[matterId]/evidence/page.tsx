import { ListTree, Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { EmptyState } from "@/components/empty-state"
import { EvidenceTable } from "@/components/evidence/evidence-table"
import { MatterHeader } from "@/components/matters/matter-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Evidence Ledger" }

export default async function EvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ matterId: string }>
  searchParams: Promise<{ review_state?: string }>
}) {
  const { matterId } = await params
  const { review_state: reviewStateFilter } = await searchParams
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  let query = supabase.from("evidence").select("*").eq("matter_id", matterId).order("evidence_number", { ascending: true })
  if (reviewStateFilter) {
    query = query.eq("review_state", reviewStateFilter)
  }
  const { data: evidence } = await query

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Evidence Ledger" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reviewStateFilter ? `Filtered to review state: ${reviewStateFilter}` : "All captured evidence for this matter."}
        </p>
        <Button
          nativeButton={false}
          render={
            <Link href={`/matters/${matterId}/evidence/new`}>
              <Plus />
              Capture evidence
            </Link>
          }
        />
      </div>

      {evidence && evidence.length > 0 ? (
        <EvidenceTable matterId={matterId} items={evidence} />
      ) : (
        <EmptyState
          icon={ListTree}
          title="No evidence captured yet"
          description="Start the Evidence Ledger by capturing your first item."
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/matters/${matterId}/evidence/new`}>Capture evidence</Link>}
            />
          }
        />
      )}
    </div>
  )
}
