import type { Metadata } from "next"

import { PublicBookingPage } from "@/components/matterpilot/public-booking"
import { createClient } from "@/lib/supabase/server"
import type { PublicFirmIdentity } from "@/lib/matterpilot/firm-settings"

export const metadata: Metadata = {
  title: "Book a consultation",
  description: "Request a secure consultation with your legal team.",
}

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_public_firm_identity", { p_booking_slug: slug })
  return <PublicBookingPage slug={slug} firm={data as unknown as PublicFirmIdentity | null} />
}
