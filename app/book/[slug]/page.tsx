import type { Metadata } from "next"

import { PublicBookingPage } from "@/components/matterpilot/public-booking"

export const metadata: Metadata = {
  title: "Book a consultation",
  description: "Request a secure consultation with Harbor Legal.",
}

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <PublicBookingPage slug={slug} />
}
