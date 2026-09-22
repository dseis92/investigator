import type { Metadata } from "next"

import { IntelligenceDashboard, type IntelligenceMatter } from "@/components/matters/intelligence-dashboard"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Matters" }

export default async function MattersPage() {
  const supabase = await createClient()
  const { data: matters } = await supabase
    .from("matters")
    .select("id, matter_number, name, case_mode, status, jurisdiction, next_deadline_at")
    .order("created_at", { ascending: false })

  return <IntelligenceDashboard matters={(matters ?? []) as IntelligenceMatter[]} />
}
