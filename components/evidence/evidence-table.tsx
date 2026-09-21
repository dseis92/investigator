import Link from "next/link"

import { StatusBadge } from "@/components/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, humanizeEnum } from "@/lib/format"
import type { Evidence } from "@/lib/domain"

export function EvidenceTable({ matterId, items }: { matterId: string; items: Evidence[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Event date</TableHead>
            <TableHead>Provenance</TableHead>
            <TableHead>Authentication</TableHead>
            <TableHead>Review state</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={item.is_excluded ? "opacity-60" : undefined}>
              <TableCell className="font-medium whitespace-nowrap">
                <Link href={`/matters/${matterId}/evidence/${item.id}`} className="hover:underline">
                  {item.evidence_number}
                </Link>
              </TableCell>
              <TableCell className="max-w-xs truncate">{item.title}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {humanizeEnum(item.artifact_type)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(item.event_date)}</TableCell>
              <TableCell>
                <StatusBadge status={item.provenance_status} />
              </TableCell>
              <TableCell>
                <StatusBadge status={item.authentication_status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{humanizeEnum(item.review_state)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
