"use client"

import { AlertTriangle } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function MattersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="text-sm font-medium">Couldn&apos;t load your matters</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something went wrong fetching your matters. Try again, or contact support if this keeps happening.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
