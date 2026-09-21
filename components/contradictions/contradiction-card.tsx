import Link from "next/link"

import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { humanizeEnum } from "@/lib/format"

export function ContradictionCard({
  matterId,
  contradiction,
}: {
  matterId: string
  contradiction: {
    id: string
    title: string
    conflict_type: string
    side_a_label: string
    side_b_label: string
    resolution_status: string
  }
}) {
  return (
    <Link href={`/matters/${matterId}/contradictions/${contradiction.id}`}>
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{contradiction.title}</CardTitle>
            <StatusBadge status={contradiction.resolution_status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>{humanizeEnum(contradiction.conflict_type)} conflict</p>
          <p>
            {contradiction.side_a_label} vs. {contradiction.side_b_label}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
