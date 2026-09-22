import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"

export default function AnalysisNotFound() {
  return (
    <EmptyState
      title="Analysis not found"
      description="This analysis may have been removed, or the link is incorrect."
      action={<Button nativeButton={false} render={<Link href="../">Back to analysis</Link>} />}
    />
  )
}
