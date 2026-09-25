import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { deliverQueuedAppointmentEmails } from "@/lib/email/delivery"

export const runtime = "nodejs"

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Supabase service configuration is missing." }, { status: 503 })
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.rpc("run_matterpilot_operations", { p_now: new Date().toISOString() })

  if (error) {
    console.error("MatterPilot operations cron failed", error)
    return NextResponse.json({ ok: false, error: "Operations job failed." }, { status: 500 })
  }

  try {
    const emailDelivery = await deliverQueuedAppointmentEmails()
    return NextResponse.json({ ok: true, run: data, emailDelivery })
  } catch (deliveryError) {
    console.error("MatterPilot email delivery failed", deliveryError)
    return NextResponse.json({ ok: false, error: "Operations completed, but email delivery failed.", run: data }, { status: 500 })
  }
}
