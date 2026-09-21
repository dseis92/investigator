import { CircleCheck } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import type { RecommendedAction } from "@/lib/matters/recommended-actions"

const priorityVariant: Record<RecommendedAction["priority"], "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
}

export function RecommendedActionsList({ actions }: { actions: RecommendedAction[] }) {
  if (actions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CircleCheck className="size-4" />
        Nothing urgent right now.
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {actions.map((action) => (
        <li key={action.id}>
          <Link
            href={action.href}
            className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted/40"
          >
            <div>
              <p className="font-medium">{action.label}</p>
              <p className="text-muted-foreground">{action.detail}</p>
            </div>
            <Badge variant={priorityVariant[action.priority]} className="shrink-0 capitalize">
              {action.priority}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  )
}
