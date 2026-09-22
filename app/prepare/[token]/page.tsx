import type { Metadata } from "next"

import { ClientPreparationPage, type ClientPacketData } from "@/components/matterpilot/client-preparation"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Client preparation",
  description: "Complete your secure MatterPilot preparation packet.",
}

export default async function ClientPreparationRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_appointment_packet", { p_token: token })
  const packet = data && typeof data === "object" && !Array.isArray(data) ? data as unknown as ClientPacketData : null

  return <ClientPreparationPage token={token} packet={packet} />
}
