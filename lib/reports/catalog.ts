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
      href: `${base}/master-chronology`,
      available: true,
    },
    {
      type: "investigative_memorandum",
      title: "Investigative Memorandum",
      description: "Narrative summary of findings, distinguishing fact, assertion, inference, and hypothesis.",
      href: `${base}/investigative-memorandum`,
      available: true,
    },
    {
      type: "witness_contradiction_report",
      title: "Witness Contradiction Report",
      description: "Every witness's statements, materially different descriptions identified, and cited evidence for each side.",
      href: `${base}/witness-contradiction-report`,
      available: true,
    },
    {
      type: "evidence_source_index",
      title: "Evidence / Source Index",
      description: "Full evidence ledger indexed by source, with provenance and authentication status.",
      href: `${base}/evidence-source-index`,
      available: true,
    },
    {
      type: "case_theory_stress_test",
      title: "Case-Theory Stress Test",
      description: "Defense theory checked against adverse evidence and the weakest assumptions on record.",
      href: `${base}/case-theory-stress-test`,
      available: true,
    },
  ]
}
