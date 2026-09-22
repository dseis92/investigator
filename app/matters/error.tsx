"use client"

import { AlertTriangle } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function MattersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#f4f1eb] px-6 text-center">
      <div className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] px-8 py-10 shadow-sm">
      <AlertTriangle className="mx-auto size-8 text-[#b65f3a]" />
      <p className="mt-4 font-serif text-xl font-semibold text-[#23313d]">Couldn&apos;t load your matters</p>
      <p className="mt-2 max-w-sm text-sm text-[#737872]">
        Something went wrong fetching your matters. Try again, or contact support if this keeps happening.
      </p>
      <Button onClick={reset} className="mt-5 bg-[#23313d] hover:bg-[#18242e]">Try again</Button>
      </div>
    </div>
  )
}
