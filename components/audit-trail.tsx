import { ScrollArea } from "@/components/ui/scroll-area"
import { formatRelative, humanizeEnum } from "@/lib/format"

export type AuditTrailEntry = {
  id: string
  action: string
  entity_type: string
  summary: string
  created_at: string
  actor_name: string | null
}

export function AuditTrail({ entries, className }: { entries: AuditTrailEntry[]; className?: string }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
  }

  return (
    <ScrollArea className={className}>
      <ol className="space-y-4">
        {entries.map((entry) => (
          <li key={entry.id} className="flex gap-3 text-sm">
            <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground">
                <span className="font-medium">{entry.actor_name ?? "Someone"}</span>{" "}
                <span className="text-muted-foreground">{humanizeEnum(entry.action).toLowerCase()}d</span>{" "}
                <span className="text-muted-foreground">a {humanizeEnum(entry.entity_type).toLowerCase()}</span>
              </p>
              <p className="truncate text-muted-foreground">{entry.summary}</p>
              <p className="text-xs text-muted-foreground/70">{formatRelative(entry.created_at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </ScrollArea>
  )
}
