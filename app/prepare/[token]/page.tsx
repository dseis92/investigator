import type { Metadata } from "next"

import { ClientPreparationPage, type ClientPacketData } from "@/components/matterpilot/client-preparation"
import { createClient } from "@/lib/supabase/server"
import type { PublicFirmIdentity } from "@/lib/matterpilot/firm-settings"

export const metadata: Metadata = {
  title: "Client preparation",
  description: "Complete your secure MatterPilot preparation packet.",
}

export default async function ClientPreparationRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_appointment_packet", { p_token: token })
  const packet = data && typeof data === "object" && !Array.isArray(data) ? data as unknown as ClientPacketData : null

  const { data: firm } = packet ? await supabase.rpc("get_public_firm_identity", { p_packet_token: token }) : { data: null }
  return <ClientPreparationPage token={token} packet={packet} firm={firm as unknown as PublicFirmIdentity | null} />
}
