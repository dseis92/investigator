"use client"

import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

export function PrintButton({ onBeforePrint }: { onBeforePrint: () => void | Promise<void> }) {
  return (
    <Button
      className="print:hidden"
      onClick={async () => {
        await onBeforePrint()
        window.print()
      }}
    >
      <Printer />
      Print / export PDF
    </Button>
  )
}
