export type MatterHealthSummary = {
  matterId: string
  openQuestionsWithoutPropositions: number
  propositionsMissingEvidence: number
  unresolvedContradictions: number
  weakProvenanceEvidenceCount: number
  staleEvidenceCount: number
  openLeadsCount: number
  subjectsCount: number
  evidenceCount: number
}

export type RecommendedAction = {
  id: string
  label: string
  detail: string
  href: string
  priority: "high" | "medium" | "low"
}

/**
 * Pure function: turns the Command Center's evidence-health counts into a
 * short, explainable list of next actions. No AI involved — every
 * recommendation traces directly to a specific count computed from real
 * matter data.
 */
export function recommendedActions(summary: MatterHealthSummary): RecommendedAction[] {
  const actions: RecommendedAction[] = []
  const base = `/matters/${summary.matterId}`

  if (summary.subjectsCount === 0) {
    actions.push({
      id: "add-subject",
      label: "Add your first subject",
      detail: "No people, businesses, or other subjects have been added yet.",
      href: `${base}/subjects`,
      priority: "high",
    })
  }

  if (summary.evidenceCount === 0) {
    actions.push({
      id: "capture-evidence",
      label: "Capture initial evidence",
      detail: "The Evidence Ledger is empty — nothing has been logged for this matter yet.",
      href: `${base}/evidence/new`,
      priority: "high",
    })
  }

  if (summary.openQuestionsWithoutPropositions > 0) {
    actions.push({
      id: "decompose-questions",
      label: `Decompose ${summary.openQuestionsWithoutPropositions} question${summary.openQuestionsWithoutPropositions === 1 ? "" : "s"} into propositions`,
      detail: "Open questions have no factual propositions attached yet.",
      href: `${base}/questions`,
      priority: "high",
    })
  }

  if (summary.propositionsMissingEvidence > 0) {
    actions.push({
      id: "link-evidence",
      label: `Link evidence to ${summary.propositionsMissingEvidence} proposition${summary.propositionsMissingEvidence === 1 ? "" : "s"}`,
      detail: "These propositions currently have no supporting or contradicting evidence linked.",
      href: `${base}/questions`,
      priority: "medium",
    })
  }

  if (summary.unresolvedContradictions > 0) {
    actions.push({
      id: "resolve-contradictions",
      label: `Review ${summary.unresolvedContradictions} unresolved contradiction${summary.unresolvedContradictions === 1 ? "" : "s"}`,
      detail: "Complete the adversarial review checklist for these conflicts.",
      href: `${base}/contradictions`,
      priority: "high",
    })
  }

  if (summary.weakProvenanceEvidenceCount > 0) {
    actions.push({
      id: "shore-up-provenance",
      label: `Shore up provenance on ${summary.weakProvenanceEvidenceCount} evidence item${summary.weakProvenanceEvidenceCount === 1 ? "" : "s"}`,
      detail: "These items are still marked unknown or disputed provenance.",
      href: `${base}/evidence`,
      priority: "medium",
    })
  }

  if (summary.staleEvidenceCount > 0) {
    actions.push({
      id: "review-stale-evidence",
      label: `Review ${summary.staleEvidenceCount} stale evidence item${summary.staleEvidenceCount === 1 ? "" : "s"}`,
      detail: "These items have sat in \"new\" review state for over 14 days.",
      href: `${base}/evidence?review_state=new`,
      priority: "low",
    })
  }

  if (summary.openLeadsCount > 0) {
    actions.push({
      id: "work-open-leads",
      label: `Work ${summary.openLeadsCount} open lead${summary.openLeadsCount === 1 ? "" : "s"}`,
      detail: "These leads have not yet produced evidence.",
      href: `${base}`,
      priority: "low",
    })
  }

  const priorityOrder: Record<RecommendedAction["priority"], number> = { high: 0, medium: 1, low: 2 }
  return actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 6)
}
