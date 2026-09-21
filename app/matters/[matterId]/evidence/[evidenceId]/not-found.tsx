import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"

export default function EvidenceNotFound() {
  return (
    <EmptyState
      title="Evidence item not found"
      description="This evidence item may have been removed, or the link is incorrect."
      action={<Button nativeButton={false} render={<Link href="../">Back to the ledger</Link>} />}
    />
  )
}
