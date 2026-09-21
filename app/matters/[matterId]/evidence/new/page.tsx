import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CaptureEvidenceForm } from "@/components/evidence/capture-evidence-form"
import { MatterHeader } from "@/components/matters/matter-header"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Capture Evidence" }

export default async function NewEvidencePage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()
  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  return (
    <div className="max-w-2xl space-y-6 pb-16">
      <MatterHeader matter={matter} section="Capture evidence" />
      <CaptureEvidenceForm matterId={matterId} />
    </div>
  )
}
