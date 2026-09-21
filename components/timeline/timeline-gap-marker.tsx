import { AlertTriangle, Ban } from "lucide-react"

export function TimelineGapMarker({ days, isCollision }: { days?: number; isCollision?: boolean }) {
  if (isCollision) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-amber-600/40 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        <Ban className="size-3.5" />
        Overlapping time windows — possible collision, review both events.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">
      <AlertTriangle className="size-3.5" />
      {days}-day evidence gap — nothing dated in this window.
    </div>
  )
}
