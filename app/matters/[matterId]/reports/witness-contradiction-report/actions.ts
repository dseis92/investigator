"use server"

import { requireCurrentUser } from "@/lib/auth/get-current-user"
import { createClient } from "@/lib/supabase/server"

export async function recordReportGenerated(matterId: string) {
  const user = await requireCurrentUser()
  const supabase = await createClient()
  await supabase.from("reports").insert({
    matter_id: matterId,
    report_type: "witness_contradiction_report",
    title: "Witness Contradiction Report",
    status: "available",
    generated_by: user.id,
  })
}
