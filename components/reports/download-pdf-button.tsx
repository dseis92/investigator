import { Download } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function DownloadPdfButton({ matterId, reportType }: { matterId: string; reportType: "proposition-evidence-matrix" | "witness-contradiction-report" }) {
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
