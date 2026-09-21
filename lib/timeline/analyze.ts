export type TimelineEventInput = {
  id: string
  title: string
  event_start: string
  event_end: string | null
  created_at: string
}

export type TimelineFlag =
  | { type: "gap"; afterEventId: string; beforeEventId: string; days: number }
  | { type: "collision"; eventIds: [string, string] }
  | { type: "late_created"; eventId: string; daysAfterEvent: number }

const GAP_THRESHOLD_DAYS = 3
const LATE_CREATED_THRESHOLD_DAYS = 90

/**
 * Pure function: flags evidence gaps (large silent stretches between
 * consecutive events), collisions (overlapping time windows), and
 * late-created records (logged long after the event they describe
 * occurred — a common sign of a record reconstructed after the fact).
 * No AI involved; every flag is a plain, explainable date comparison.
 */
export function analyzeTimeline(events: TimelineEventInput[]): TimelineFlag[] {
  const flags: TimelineFlag[] = []
  const sorted = [...events].sort((a, b) => new Date(a.event_start).getTime() - new Date(b.event_start).getTime())

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]
    const currentEnd = new Date(current.event_end ?? current.event_start).getTime()
    const nextStart = new Date(next.event_start).getTime()

    const gapDays = (nextStart - currentEnd) / (1000 * 60 * 60 * 24)
    if (gapDays >= GAP_THRESHOLD_DAYS) {
      flags.push({ type: "gap", afterEventId: current.id, beforeEventId: next.id, days: Math.round(gapDays) })
    } else if (nextStart < currentEnd) {
      flags.push({ type: "collision", eventIds: [current.id, next.id] })
    }
  }

  for (const event of sorted) {
    const daysAfter =
      (new Date(event.created_at).getTime() - new Date(event.event_start).getTime()) / (1000 * 60 * 60 * 24)
    if (daysAfter >= LATE_CREATED_THRESHOLD_DAYS) {
      flags.push({ type: "late_created", eventId: event.id, daysAfterEvent: Math.round(daysAfter) })
    }
  }

  return flags
}
