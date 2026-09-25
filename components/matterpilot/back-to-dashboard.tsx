import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"

export function BackToDashboard({ className }: { className?: string }) {
  return (
    <Link
      href="/matterpilot"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-xs font-semibold text-[#59645e] transition-colors hover:border-[#c08a6d] hover:text-[#a24f31]",
        className
      )}
    >
      <ArrowLeft className="size-3.5" />
      Back to dashboard
    </Link>
  )
}
