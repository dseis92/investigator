export const WORKFLOW_OPTIONS = [
  { key: "initial_consultation", label: "Initial consultation", duration: "45 min", tag: "New client", defaultTitle: "Initial consultation", defaultLocation: "Video call · Zoom", tasks: ["Conflict check complete", "Intake form completed", "Consultation agenda prepared"], documents: ["Intake questionnaire", "Engagement letter", "Consultation agenda"] },
  { key: "client_meeting", label: "Client meeting", duration: "60 min", tag: "Existing matter", defaultTitle: "Client meeting", defaultLocation: "Video call · Zoom", tasks: ["Agenda shared", "Client confirmation received"], documents: ["Meeting agenda"] },
  { key: "deposition_preparation", label: "Deposition preparation", duration: "90 min", tag: "Litigation", defaultTitle: "Deposition preparation", defaultLocation: "Conference room 2", tasks: ["Conflict check complete", "Witness statement reviewed", "Prep outline assigned"], documents: ["Deposition notice", "Witness packet", "Prep outline"] },
  { key: "mediation", label: "Mediation conference", duration: "2 hr", tag: "Settlement", defaultTitle: "Mediation conference", defaultLocation: "Carter ADR · Room 4", tasks: ["Conflict check complete", "Mediation statement approved", "Authority confirmed", "All parties confirmed"], documents: ["Mediation statement", "Damages summary", "Settlement authority"] },
  { key: "court_appearance", label: "Court appearance / hearing", duration: "60 min", tag: "Court", defaultTitle: "Court appearance", defaultLocation: "Courthouse", tasks: ["Court notice saved", "Hearing prep complete", "Client reminder sent"], documents: ["Court notice", "Hearing outline"] },
  { key: "expert_consultation", label: "Expert consultation", duration: "60 min", tag: "Expert", defaultTitle: "Expert consultation", defaultLocation: "Video call · Teams", tasks: ["Materials shared", "Questions assigned"], documents: ["Expert packet", "Prior opinions"] },
  { key: "witness_interview", label: "Witness interview", duration: "60 min", tag: "Investigation", defaultTitle: "Witness interview", defaultLocation: "Interview room", tasks: ["Interview outline prepared", "Recording/consent confirmed"], documents: ["Interview outline"] },
  { key: "internal_case_conference", label: "Internal case conference", duration: "45 min", tag: "Team", defaultTitle: "Internal case conference", defaultLocation: "Conference room", tasks: ["Agenda prepared", "Action items assigned"], documents: ["Conference agenda"] },
  { key: "filing_deadline", label: "Filing deadline / legal deadline", duration: "30 min", tag: "Deadline", defaultTitle: "Filing deadline", defaultLocation: "Internal calendar", tasks: ["Deadline verified", "Filing checklist assigned", "Proof of service planned"], documents: ["Filing checklist"] },
  { key: "quick_note", label: "Quick calendar note", duration: "15 min", tag: "No matter required", defaultTitle: "Calendar note", defaultLocation: "Internal calendar", tasks: [], documents: [] },
] as const

export type WorkflowKey = (typeof WORKFLOW_OPTIONS)[number]["key"]

export function getWorkflow(key: string) {
  return WORKFLOW_OPTIONS.find((workflow) => workflow.key === key) ?? WORKFLOW_OPTIONS[0]
}

export function getWorkflowByLabel(label: string) {
  return WORKFLOW_OPTIONS.find((workflow) => workflow.label.toLowerCase() === label.trim().toLowerCase()) ?? WORKFLOW_OPTIONS[0]
}

export function getWorkflowDurationMinutes(key: string) {
  const duration = getWorkflow(key).duration
  const amount = Number.parseInt(duration, 10)
  return duration.includes("hr") ? amount * 60 : amount
}
