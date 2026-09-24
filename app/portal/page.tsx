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
  const baseHome = data && typeof data === "object" && !Array.isArray(data) ? data as unknown as ClientPortalHomeData : null
  const home = baseHome ? {
    ...baseHome,
    matters: await Promise.all(baseHome.matters.map(async (matter) => {
      const [{ data: portalData }, { data: documentData }] = await Promise.all([
        supabase.rpc("get_client_portal_messages", { p_matter_id: matter.id }),
        supabase.rpc("get_client_portal_documents", { p_matter_id: matter.id }),
      ])
      const details = portalData && typeof portalData === "object" && !Array.isArray(portalData) ? portalData as { messages?: ClientPortalHomeData["matters"][number]["messages"]; activity?: ClientPortalHomeData["matters"][number]["activity"] } : {}
      const documentRequests = Array.isArray(documentData) ? documentData as ClientPortalHomeData["matters"][number]["documentRequests"] : []
      return { ...matter, messages: details.messages ?? [], activity: details.activity ?? [], documentRequests }
    })),
  } : null
  return <ClientPortalPage userEmail={userData.user.email ?? null} home={home} />
}
