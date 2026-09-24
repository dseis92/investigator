import { Download } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export type DownloadableReportType =
  | "proposition-evidence-matrix"
  | "master-chronology"
  | "investigative-memorandum"
  | "witness-contradiction-report"
  | "evidence-source-index"
  | "case-theory-stress-test"

export function DownloadPdfButton({ matterId, reportType }: { matterId: string; reportType: DownloadableReportType }) {
  return (
    <a
      href={`/api/matters/${matterId}/reports/${reportType}/pdf`}
      download
      className={buttonVariants({ variant: "outline" })}
    >
      <Download />
      Download branded PDF
    </a>
  )
}
