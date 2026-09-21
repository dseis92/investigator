import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { MatterHeader } from "@/components/matters/matter-header"
import { ReportCatalogCard } from "@/components/reports/report-catalog-card"
import { reportCatalog } from "@/lib/reports/catalog"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Reports" }

export default async function ReportsPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()
  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Reports" />
      <p className="text-sm text-muted-foreground">
        Generated from the same evidence model as the rest of the workspace — every report cites evidence IDs and
        source locators.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {reportCatalog(matterId).map((entry) => (
          <ReportCatalogCard key={entry.type} entry={entry} />
        ))}
      </div>
    </div>
  )
}
