import { GitCompareArrows } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AddEventForm } from "@/components/timeline/add-event-form"
import { TimelineEventRow, type TimelineEventData } from "@/components/timeline/timeline-event-row"
import { TimelineGapMarker } from "@/components/timeline/timeline-gap-marker"
import { EmptyState } from "@/components/empty-state"
import { MatterHeader } from "@/components/matters/matter-header"
import { analyzeTimeline } from "@/lib/timeline/analyze"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Timeline" }

const LATE_CREATED_THRESHOLD_DAYS = 90

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ matterId: string }>
  searchParams: Promise<{ favorability?: string }>
}) {
  const { matterId } = await params
  const { favorability } = await searchParams
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  let query = supabase.from("events").select("*").eq("matter_id", matterId).order("event_start", { ascending: true })
  if (favorability) query = query.eq("favorability", favorability)
  const [{ data: events }, { data: links }, { data: evidence }] = await Promise.all([
    query,
    supabase
      .from("evidence_links")
      .select("event_id, evidence:evidence(id, evidence_number, title)")
      .eq("matter_id", matterId)
      .not("event_id", "is", null),
    supabase
      .from("evidence")
      .select("id, evidence_number, title")
      .eq("matter_id", matterId)
      .eq("is_excluded", false)
      .order("evidence_number", { ascending: true }),
  ])

  const evidenceByEvent = new Map<string, { id: string; evidence_number: string; title: string }[]>()
  for (const link of links ?? []) {
    if (!link.event_id || !link.evidence) continue
    const list = evidenceByEvent.get(link.event_id) ?? []
    list.push(link.evidence as unknown as { id: string; evidence_number: string; title: string })
    evidenceByEvent.set(link.event_id, list)
  }

  const flags = analyzeTimeline(events ?? [])
  const gapBefore = new Map(flags.filter((f) => f.type === "gap").map((f) => [f.beforeEventId, f]))
  const collisionIds = new Set(
    flags.filter((f) => f.type === "collision").flatMap((f) => f.eventIds)
  )
  const lateCreated = new Map(flags.filter((f) => f.type === "late_created").map((f) => [f.eventId, f]))

  const evidenceOptions = (evidence ?? []).map((e) => ({ id: e.id, evidence_number: e.evidence_number, title: e.title }))

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Timeline" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {favorability ? `Filtered to ${favorability} events.` : "Chronology built from dated evidence."}
        </p>
        <AddEventForm matterId={matterId} evidenceOptions={evidenceOptions} />
      </div>

      {events && events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event) => {
            const gap = gapBefore.get(event.id)
            const lateFlag = lateCreated.get(event.id)

            const data: TimelineEventData = {
              id: event.id,
              title: event.title,
              description: event.description,
              event_start: event.event_start,
              event_end: event.event_end,
              confidence: event.confidence,
              favorability: event.favorability,
              category: event.category,
              createdAtWasLate: Boolean(lateFlag),
              lateDays: lateFlag?.type === "late_created" ? lateFlag.daysAfterEvent : undefined,
              linkedEvidence: evidenceByEvent.get(event.id) ?? [],
            }

            return (
              <div key={event.id} className="space-y-2">
                {gap && gap.type === "gap" ? <TimelineGapMarker days={gap.days} /> : null}
                {collisionIds.has(event.id) ? <TimelineGapMarker isCollision /> : null}
                <TimelineEventRow matterId={matterId} event={data} />
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={GitCompareArrows}
          title="No timeline events yet"
          description="Add dated events to build the chronology for this matter."
        />
      )}

      <p className="text-xs text-muted-foreground">
        Gaps flagged at {"≥"}3 days of silence between events. Records logged {LATE_CREATED_THRESHOLD_DAYS}+ days
        after the event they describe are flagged as late-created.
      </p>
    </div>
  )
}
