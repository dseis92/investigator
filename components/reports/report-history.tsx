import { Download, History } from "lucide-react"

import { reportCatalog } from "@/lib/reports/catalog"

type ReportHistoryRow = {
  id: string
  title: string
  reportType: string
  outputFormat: string
  fileName: string | null
  byteSize: number | null
  generatedAt: string
}

const reportSlugs: Record<string, string> = {
  proposition_evidence_matrix: "proposition-evidence-matrix",
  master_chronology: "master-chronology",
  investigative_memorandum: "investigative-memorandum",
  witness_contradiction_report: "witness-contradiction-report",
  evidence_source_index: "evidence-source-index",
  case_theory_stress_test: "case-theory-stress-test",
}

function reportHref(matterId: string, reportType: string, outputFormat: string) {
  const slug = reportSlugs[reportType]
  if (slug && outputFormat === "pdf") return `/api/matters/${matterId}/reports/${slug}/pdf`
  const entry = reportCatalog(matterId).find((item) => item.type === reportType)
  return entry?.href ?? `/matters/${matterId}/reports`
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ""
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function ReportHistory({ matterId, reports }: { matterId: string; reports: ReportHistoryRow[] }) {
  return <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]"><History className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#b65f3a]">Matter record</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#23313d]">Report history</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[#8b8d88]">A durable record of generated PDFs and browser print exports. Each PDF can be regenerated from the current matter records.</p></div></div><div className="mt-5 space-y-2">{reports.length ? reports.map((report) => <div key={report.id} className="flex flex-col gap-3 rounded-xl border border-[#e8e3da] bg-white p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#39443f]">{report.title}</p><p className="mt-1 text-[11px] text-[#8b8d88]">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))} · {report.outputFormat === "pdf" ? "Branded PDF" : "Browser print"}{report.byteSize ? ` · ${formatBytes(report.byteSize)}` : ""}</p></div><a href={reportHref(matterId, report.reportType, report.outputFormat)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#ded9d0] px-3 py-2 text-xs font-semibold text-[#a24f31] transition-colors hover:border-[#c08a6d] hover:bg-[#fffaf6]"><Download className="size-3.5" />{report.outputFormat === "pdf" ? "Download again" : "Open report"}</a></div>) : <div className="rounded-xl border border-dashed border-[#d9d3c9] bg-white/70 px-4 py-7 text-center"><History className="mx-auto size-5 text-[#c8b6a8]" /><p className="mt-2 text-xs text-[#8b8d88]">No report generations recorded yet.</p><p className="mt-1 text-[11px] text-[#aaa9a3]">Generate a branded PDF from any report to start the history.</p></div>}</div></section>
}
