"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { updateResolutionStatus } from "@/app/matters/[matterId]/contradictions/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { humanizeEnum } from "@/lib/format"

const RESOLUTION_STATUSES = ["unresolved", "resolved_a", "resolved_b", "partially_resolved", "cannot_resolve"]

export function ResolutionStatusControl({
  matterId,
  contradictionId,
  value,
}: {
  matterId: string
  contradictionId: string
  value: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Select
      value={value}
      disabled={isPending}
      onValueChange={(next) => {
        if (!next) return
        startTransition(async () => {
          const result = await updateResolutionStatus(matterId, contradictionId, next)
          if (result?.error) toast.error(result.error)
        })
      }}
    >
      <SelectTrigger className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RESOLUTION_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {humanizeEnum(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
