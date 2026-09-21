import { notFound } from "next/navigation"

import { MatterShellNav } from "@/components/matters/matter-shell-nav"
import { createClient } from "@/lib/supabase/server"

export default async function MatterLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ matterId: string }>
}) {
  const { matterId } = await params
  const supabase = await createClient()

  // RLS scopes this select to matter members only, so a non-member querying
  // a real matter gets zero rows — identical to querying a nonexistent one.
  // Both cases render the same not-found page, so the app never reveals
  // whether a matter exists to someone who isn't on it.
  const { data: matter } = await supabase.from("matters").select("id").eq("id", matterId).maybeSingle()

  if (!matter) {
    notFound()
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-8 lg:flex-row lg:gap-8">
      <div className="shrink-0 print:hidden lg:w-48">
        <MatterShellNav matterId={matterId} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
