import Link from "next/link"

import { SignOutButton } from "@/components/sign-out-button"
import { StatusBadge } from "@/components/status-badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { formatDate, humanizeEnum } from "@/lib/format"
import type { Matter } from "@/lib/domain"

export function MatterHeader({ matter, section }: { matter: Matter; section?: string }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4 print:hidden">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/matters">Matters</Link>} />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {section ? (
                <BreadcrumbLink render={<Link href={`/matters/${matter.id}`}>{matter.name}</Link>} />
              ) : (
                <BreadcrumbPage>{matter.name}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {section ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{section}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
        <SignOutButton />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{matter.matter_number}</span>
        <StatusBadge status={matter.status} />
        <span>{humanizeEnum(matter.case_mode)}</span>
        {matter.jurisdiction ? <span>{matter.jurisdiction}</span> : null}
        {matter.venue ? <span>{matter.venue}</span> : null}
        {matter.next_deadline_at ? <span>Next deadline: {formatDate(matter.next_deadline_at)}</span> : null}
      </div>
    </header>
  )
}
