import { GitCompareArrows } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ContradictionCard } from "@/components/contradictions/contradiction-card"
import { CreateContradictionDialog } from "@/components/contradictions/create-contradiction-dialog"
import { EmptyState } from "@/components/empty-state"
import { MatterHeader } from "@/components/matters/matter-header"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Contradictions" }

export default async function ContradictionsPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const { data: contradictions } = await supabase
    .from("contradictions")
    .select("id, title, conflict_type, side_a_label, side_b_label, resolution_status")
    .eq("matter_id", matterId)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Contradictions" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Conflicting accounts, shown neutrally with evidence for each side.</p>
        <CreateContradictionDialog matterId={matterId} />
      </div>

      {contradictions && contradictions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {contradictions.map((c) => (
            <ContradictionCard key={c.id} matterId={matterId} contradiction={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GitCompareArrows}
          title="No contradictions logged"
          description="When conflicting accounts or evidence emerge, log them here for adversarial review."
        />
      )}
    </div>
  )
}
