import type { Metadata } from "next"

import { IntakeDesk } from "@/components/matterpilot/intake-desk"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Intake · MatterPilot",
  description: "Review new client requests and conflict checks.",
}

export default async function IntakePage() {
  const supabase = await createClient()
  const { data: requests } = await supabase
    .from("booking_requests")
    .select("id, matter_id, appointment_type_name, requested_start, full_name, email, summary, status, created_at")
    .in("status", ["pending", "needs_info"])
    .order("created_at", { ascending: false })
    .limit(50)

  const requestRows = requests ?? []
  const matterIds = [...new Set(requestRows.map((request) => request.matter_id))]
  const [{ data: matters }, { data: reviews }] = matterIds.length
    ? await Promise.all([
        supabase.from("matters").select("id, name, matter_number").in("id", matterIds),
        supabase.from("intake_reviews").select("booking_request_id, decision, conflict_status, reviewer_note, updated_at").in("booking_request_id", requestRows.map((request) => request.id)),
      ])
    : [{ data: [] }, { data: [] }]

  const conflictMatches = await Promise.all(requestRows.map(async (request) => {
    const { data } = await supabase
      .from("subjects")
      .select("id, matter_id, display_name, subject_type")
      .ilike("display_name", `%${request.full_name}%`)
      .limit(8)
    return [request.id, data ?? []] as const
  }))

  return <IntakeDesk requests={requestRows} matters={matters ?? []} reviews={reviews ?? []} conflictMatches={Object.fromEntries(conflictMatches)} />
}
