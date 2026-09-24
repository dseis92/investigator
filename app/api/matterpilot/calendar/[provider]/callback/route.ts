import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/get-current-user"
import { exchangeCalendarCode, encryptCalendarToken, fetchCalendarAccount, oauthStateMatches, type CalendarProvider } from "@/lib/calendar/oauth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function isProvider(value: string): value is CalendarProvider {
  return value === "google" || value === "outlook"
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerParam } = await params
  if (!isProvider(providerParam)) return NextResponse.json({ error: "Calendar provider not found." }, { status: 404 })

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error")
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL("/auth/login?next=/matterpilot/operations", request.url))

  const supabase = await createClient()
  const { data: pendingConnections } = await supabase.from("calendar_sync_connections").select("id, matter_id, oauth_state_hash").eq("provider", providerParam).eq("user_id", user.id).eq("status", "pending").order("updated_at", { ascending: false })
  const pendingConnection = pendingConnections?.find((candidate) => Boolean(state) && oauthStateMatches(state as string, candidate.oauth_state_hash))
  if (!pendingConnection || !state) return NextResponse.json({ error: "Calendar authorization state expired or invalid." }, { status: 400 })

  const admin = createAdminClient()
  if (providerError || !code) {
    await admin.from("calendar_sync_connections").update({ status: "error", error_message: providerError || "The calendar provider did not return an authorization code.", oauth_state_hash: null, updated_at: new Date().toISOString() }).eq("id", pendingConnection.id).eq("user_id", user.id)
    return NextResponse.redirect(new URL("/matterpilot/operations?calendar=cancelled", request.url))
  }

  try {
    const token = await exchangeCalendarCode(providerParam, code)
    const account = await fetchCalendarAccount(providerParam, token.access_token)
    const { data: existingSecret } = await admin.from("calendar_sync_secrets").select("refresh_token_encrypted").eq("connection_id", pendingConnection.id).maybeSingle()
    const { error: secretError } = await admin.from("calendar_sync_secrets").upsert({
      connection_id: pendingConnection.id,
      access_token_encrypted: encryptCalendarToken(token.access_token),
      refresh_token_encrypted: token.refresh_token ? encryptCalendarToken(token.refresh_token) : existingSecret?.refresh_token_encrypted ?? null,
      access_token_expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "connection_id" })
    if (secretError) throw new Error("Unable to securely store the calendar connection.")
    const { error: connectionError } = await admin.from("calendar_sync_connections").update({ status: "connected", provider_account_email: account.email, external_calendar_id: account.calendarId, calendar_name: account.calendarName, scope: token.scope || null, oauth_state_hash: null, error_message: null, updated_at: new Date().toISOString() }).eq("id", pendingConnection.id).eq("user_id", user.id)
    if (connectionError) throw new Error("Unable to finish the calendar connection.")
    return NextResponse.redirect(new URL("/matterpilot/operations?calendar=connected", request.url))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar authorization failed."
    await admin.from("calendar_sync_connections").update({ status: "error", error_message: message, oauth_state_hash: null, updated_at: new Date().toISOString() }).eq("id", pendingConnection.id).eq("user_id", user.id)
    return NextResponse.redirect(new URL("/matterpilot/operations?calendar=error", request.url))
  }
}
