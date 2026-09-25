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

export const EMPTY_CUSTOM_WORKFLOWS: CustomWorkflow[] = []

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
