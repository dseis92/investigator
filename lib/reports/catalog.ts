export type ReportCatalogEntry = {
  type: string
  title: string
  description: string
  href?: string
  available: boolean
}

export function reportCatalog(matterId: string): ReportCatalogEntry[] {
  const base = `/matters/${matterId}/reports`
  return [
    {
      type: "proposition_evidence_matrix",
      title: "Proposition Evidence Matrix",
      description: "Every proposition with its supporting, contradicting, and missing evidence, cited by evidence ID and source locator.",
      href: `${base}/proposition-evidence-matrix`,
      available: true,
    },
    {
      type: "master_chronology",
      title: "Master Chronology",
      description: "Full dated timeline with gaps, collisions, and late-created records flagged.",
      available: false,
    },
    {
      type: "investigative_memorandum",
      title: "Investigative Memorandum",
      description: "Narrative summary of findings, distinguishing fact, assertion, inference, and hypothesis.",
      available: false,
    },
    {
      type: "witness_contradiction_report",
      title: "Witness Contradiction Report",
      description: "All logged contradictions with adversarial review notes.",
      available: false,
    },
    {
      type: "evidence_source_index",
      title: "Evidence / Source Index",
      description: "Full evidence ledger indexed by source, with provenance and authentication status.",
      available: false,
    },
    {
      type: "case_theory_stress_test",
      title: "Case-Theory Stress Test",
      description: "Defense theory checked against adverse evidence and the weakest assumptions on record.",
      available: false,
    },
  ]
}
