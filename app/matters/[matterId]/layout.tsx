import { notFound } from "next/navigation"

import { MatterWorkspaceShell } from "@/components/matters/matter-shell-nav"
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
  const { data: matter } = await supabase.from("matters").select("id, name, matter_number, status, case_mode").eq("id", matterId).maybeSingle()

  if (!matter) {
    notFound()
  }

  return <MatterWorkspaceShell matter={matter}>{children}</MatterWorkspaceShell>
}
