import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"

export default function ContradictionNotFound() {
  return (
    <EmptyState
      title="Contradiction not found"
      description="This item may have been removed, or the link is incorrect."
      action={<Button nativeButton={false} render={<Link href="../">Back to contradictions</Link>} />}
    />
  )
}
