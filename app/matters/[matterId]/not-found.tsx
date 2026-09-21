import { LockKeyhole } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function MatterNotFound() {
  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center gap-3 px-6 text-center">
      <LockKeyhole className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">Matter not found</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        This matter doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Button nativeButton={false} render={<Link href="/matters">Back to matters</Link>} />
    </div>
  )
}
