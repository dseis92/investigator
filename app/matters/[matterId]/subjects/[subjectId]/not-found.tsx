import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"

export default function SubjectNotFound() {
  return (
    <EmptyState
      title="Subject not found"
      description="This subject may have been removed, or the link is incorrect."
      action={<Button nativeButton={false} render={<Link href="../">Back to subjects</Link>} />}
    />
  )
}
