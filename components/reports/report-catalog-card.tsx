import { Lock } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReportCatalogEntry } from "@/lib/reports/catalog"

export function ReportCatalogCard({ entry }: { entry: ReportCatalogEntry }) {
  if (!entry.available) {
    return (
      <Card aria-disabled="true" className="opacity-60">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{entry.title}</CardTitle>
            <Badge variant="outline">
              <Lock />
              Planned
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{entry.description}</CardContent>
      </Card>
    )
  }

  return (
    <Link href={entry.href!}>
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">{entry.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{entry.description}</CardContent>
      </Card>
    </Link>
  )
}
