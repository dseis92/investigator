"use client"

import { CheckCircle2, XCircle } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { reviewAnalysis } from "@/app/matters/[matterId]/analysis/actions"
import { RoleGate } from "@/components/role-gate"
import { Button } from "@/components/ui/button"

export function ReviewActions({
  matterId,
  analysisId,
  status,
  canReview,
}: {
  matterId: string
  analysisId: string
  status: string
  canReview: boolean
}) {
  const [isPending, startTransition] = useTransition()

  if (status === "final" || status === "rejected") {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <RoleGate allowed={canReview} reason="Your role does not permit finalizing or rejecting an analysis.">
        <Button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await reviewAnalysis(matterId, analysisId, "approved")
              if (result?.error) toast.error(result.error)
              else toast.success("Analysis approved as final.")
            })
          }}
        >
          <CheckCircle2 />
          Approve as final
        </Button>
      </RoleGate>
      <RoleGate allowed={canReview} reason="Your role does not permit finalizing or rejecting an analysis.">
        <Button
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await reviewAnalysis(matterId, analysisId, "rejected")
              if (result?.error) toast.error(result.error)
              else toast.success("Analysis rejected.")
            })
          }}
        >
          <XCircle />
          Reject
        </Button>
      </RoleGate>
    </div>
  )
}
