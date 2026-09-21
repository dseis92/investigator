"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { updateReviewState } from "@/app/matters/[matterId]/evidence/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { REVIEW_STATES } from "@/lib/domain"
import { humanizeEnum } from "@/lib/format"

export function ReviewStateControl({
  matterId,
  evidenceId,
  value,
  disabled,
}: {
  matterId: string
  evidenceId: string
  value: string
  disabled?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Select
      value={value}
      disabled={disabled || isPending}
      onValueChange={(next) => {
        if (!next) return
        startTransition(async () => {
          const result = await updateReviewState(matterId, evidenceId, next)
          if (result?.error) toast.error(result.error)
        })
      }}
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REVIEW_STATES.map((state) => (
          <SelectItem key={state} value={state}>
            {humanizeEnum(state)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
