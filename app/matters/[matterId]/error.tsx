"use client"

import { AlertTriangle } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function MatterError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        This section of the matter failed to load. Try again, or contact support if this keeps happening.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
