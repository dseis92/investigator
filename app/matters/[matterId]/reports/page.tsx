import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { MatterHeader } from "@/components/matters/matter-header"
import { ReportCatalogCard } from "@/components/reports/report-catalog-card"
import { ReportHistory } from "@/components/reports/report-history"
import { reportCatalog } from "@/lib/reports/catalog"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Reports" }

export default async function ReportsPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()
  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const { data: reports } = await supabase
    .from("reports")
    .select("id, title, report_type, output_format, file_name, byte_size, generated_at")
    .eq("matter_id", matterId)
    .order("generated_at", { ascending: false })
    .limit(30)

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
      <ReportHistory
        matterId={matterId}
        reports={(reports ?? []).map((report) => ({
          id: report.id,
          title: report.title,
          reportType: report.report_type,
          outputFormat: report.output_format,
          fileName: report.file_name,
          byteSize: report.byte_size,
          generatedAt: report.generated_at,
        }))}
      />
    </div>
  )
}
