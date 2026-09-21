"use client"

import Link from "next/link"

import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatDateTime, humanizeEnum } from "@/lib/format"

export type TimelineEventData = {
  id: string
  title: string
  description: string | null
  event_start: string
  event_end: string | null
  confidence: string
  favorability: string
  category: string | null
  createdAtWasLate: boolean
  lateDays?: number
  linkedEvidence: { id: string; evidence_number: string; title: string }[]
}

const favorabilityStyle: Record<string, string> = {
  adverse: "border-red-600/30 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  favorable: "border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  neutral: "border-border bg-muted text-muted-foreground",
}

export function TimelineEventRow({ matterId, event }: { matterId: string; event: TimelineEventData }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="flex w-full items-start gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-muted/40"
          />
        }
      >
        <div className="w-40 shrink-0 text-xs text-muted-foreground">{formatDateTime(event.event_start)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{event.title}</p>
          {event.description ? <p className="truncate text-xs text-muted-foreground">{event.description}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <span
            className={`inline-flex h-5 items-center rounded-4xl border px-2 text-xs font-medium ${favorabilityStyle[event.favorability] ?? favorabilityStyle.neutral}`}
          >
            {humanizeEnum(event.favorability)}
          </span>
          <StatusBadge status={event.confidence} />
          {event.createdAtWasLate ? <Badge variant="destructive">Late-created</Badge> : null}
        </div>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{event.title}</SheetTitle>
          <SheetDescription>
            {formatDateTime(event.event_start)}
            {event.event_end ? ` – ${formatDateTime(event.event_end)}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={event.confidence} />
            <span
              className={`inline-flex h-5 items-center rounded-4xl border px-2 text-xs font-medium ${favorabilityStyle[event.favorability] ?? favorabilityStyle.neutral}`}
            >
              {humanizeEnum(event.favorability)}
            </span>
            {event.category ? <Badge variant="outline">{humanizeEnum(event.category)}</Badge> : null}
            {event.createdAtWasLate ? (
              <Badge variant="destructive">Logged {event.lateDays} days after the event</Badge>
            ) : null}
          </div>
          {event.description ? <p className="text-sm">{event.description}</p> : null}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Underlying evidence</p>
            {event.linkedEvidence.length > 0 ? (
              <ul className="space-y-1">
                {event.linkedEvidence.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/matters/${matterId}/evidence/${e.id}`}
                      className="text-sm underline-offset-2 hover:underline"
                    >
                      {e.evidence_number} — {e.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No evidence linked to this event yet.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
