import { Scale } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/30 px-6 py-12">
      <div className="flex items-center gap-2 text-sm font-medium tracking-tight">
        <Scale className="size-5" />
        TraceLine
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
