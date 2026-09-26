export type CustomWorkflow = {
  id: string
  label: string
  durationMinutes: number
  tag: string
  defaultTitle: string
  defaultLocation: string
  tasks: string[]
  documents: string[]
  active: boolean
}

export type MatterStarterTemplate = {
  id: string
  name: string
  caseMode: "criminal_defense" | "civil_defense"
  practiceArea: string
  defaultStatus: "active" | "on_hold"
  jurisdiction: string
  venue: string
  intakeQuestions: string[]
  preparationTasks: string[]
  documentRequests: string[]
  active: boolean
}

export const EMPTY_CUSTOM_WORKFLOWS: CustomWorkflow[] = []
export const EMPTY_MATTER_STARTER_TEMPLATES: MatterStarterTemplate[] = []

function stringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 20)
}

export function parseCustomWorkflows(value: unknown): CustomWorkflow[] {
  if (!Array.isArray(value)) return EMPTY_CUSTOM_WORKFLOWS
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return []
    const candidate = item as Record<string, unknown>
    const label = typeof candidate.label === "string" ? candidate.label.trim() : ""
    const durationMinutes = typeof candidate.durationMinutes === "number" ? candidate.durationMinutes : Number(candidate.durationMinutes)
    if (!label || !Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) return []
    return [{
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : `custom-${crypto.randomUUID()}`,
      label,
      durationMinutes: Math.round(durationMinutes),
      tag: typeof candidate.tag === "string" && candidate.tag.trim() ? candidate.tag.trim() : "Firm workflow",
      defaultTitle: typeof candidate.defaultTitle === "string" && candidate.defaultTitle.trim() ? candidate.defaultTitle.trim() : label,
      defaultLocation: typeof candidate.defaultLocation === "string" && candidate.defaultLocation.trim() ? candidate.defaultLocation.trim() : "To be confirmed",
      tasks: stringList(candidate.tasks),
      documents: stringList(candidate.documents),
      active: candidate.active !== false,
    } satisfies CustomWorkflow]
  }).slice(0, 40)
}

export function parseMatterStarterTemplates(value: unknown): MatterStarterTemplate[] {
  if (!Array.isArray(value)) return EMPTY_MATTER_STARTER_TEMPLATES
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return []
    const candidate = item as Record<string, unknown>
    const name = typeof candidate.name === "string" ? candidate.name.trim() : ""
    const caseMode = candidate.caseMode === "civil_defense" ? "civil_defense" : candidate.caseMode === "criminal_defense" ? "criminal_defense" : null
    if (!name || !caseMode) return []
    return [{
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : `matter-template-${crypto.randomUUID()}`,
      name,
      caseMode,
      practiceArea: typeof candidate.practiceArea === "string" ? candidate.practiceArea.trim() : "",
      defaultStatus: candidate.defaultStatus === "on_hold" ? "on_hold" : "active",
      jurisdiction: typeof candidate.jurisdiction === "string" ? candidate.jurisdiction.trim() : "",
      venue: typeof candidate.venue === "string" ? candidate.venue.trim() : "",
      intakeQuestions: stringList(candidate.intakeQuestions),
      preparationTasks: stringList(candidate.preparationTasks),
      documentRequests: stringList(candidate.documentRequests),
      active: candidate.active !== false,
    } satisfies MatterStarterTemplate]
  }).slice(0, 30)
}
