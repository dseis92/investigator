import type { Metadata } from "next"

import { ClientPortalPage, type ClientPortalHomeData } from "@/components/matterpilot/client-portal"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Client portal",
  description: "Secure, matter-scoped client access from MatterPilot.",
}

export const dynamic = "force-dynamic"

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return <ClientPortalPage userEmail={null} home={null} />

  const { data } = await supabase.rpc("get_client_portal_home")
  const home = data && typeof data === "object" && !Array.isArray(data) ? data as unknown as ClientPortalHomeData : null
  return <ClientPortalPage userEmail={userData.user.email ?? null} home={home} />
}
