import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { decryptCalendarToken, encryptCalendarToken, refreshCalendarToken, type CalendarProvider } from "@/lib/calendar/oauth"

type CalendarConnection = {
  id: string
  provider: CalendarProvider
  user_id: string
  matter_id: string | null
  external_calendar_id: string | null
  status: string
}

type Appointment = {
  id: string
  matter_id: string
  title: string
  starts_at: string
  ends_at: string
  status: string
  workflow_key: string
  location: string | null
}

async function providerJson(response: Response, message: string) {
  const payload = await response.json().catch(() => null) as { error?: { message?: string }; error_description?: string } | null
  if (!response.ok) throw new Error(payload?.error?.message || payload?.error_description || message)
  return payload as { id?: string; etag?: string; "@odata.etag"?: string }
}

function eventBody(provider: CalendarProvider, appointment: Appointment) {
  const description = [
    "MatterPilot appointment",
    `Workflow status: ${appointment.status}`,
  ].join("\n")
  if (provider === "google") {
    return {
      summary: appointment.title,
      description,
      location: appointment.location || undefined,
      start: { dateTime: appointment.starts_at },
      end: { dateTime: appointment.ends_at },
      transparency: "opaque",
      visibility: "private",
    }
  }
  return {
    subject: appointment.title,
    body: { contentType: "text", content: description },
    location: appointment.location ? { displayName: appointment.location } : undefined,
    start: { dateTime: appointment.starts_at, timeZone: "UTC" },
    end: { dateTime: appointment.ends_at, timeZone: "UTC" },
    showAs: "busy",
    sensitivity: "private",
  }
}

async function pushEvent(provider: CalendarProvider, accessToken: string, calendarId: string, appointment: Appointment, externalEventId?: string) {
  const base = provider === "google"
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`
  const url = externalEventId ? `${base}/${encodeURIComponent(externalEventId)}` : base
  const response = await fetch(url, {
    method: externalEventId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventBody(provider, appointment)),
    cache: "no-store",
  })
  const payload = await providerJson(response, `Unable to ${externalEventId ? "update" : "create"} the ${provider} calendar event.`)
  if (!payload.id && !externalEventId) throw new Error(`The ${provider} calendar did not return an event ID.`)
  return { id: payload.id || externalEventId!, etag: payload.etag || payload["@odata.etag"] || null }
}

async function getUsableAccessToken(connection: CalendarConnection, secret: { access_token_encrypted: string; refresh_token_encrypted: string | null; access_token_expires_at: string | null }) {
  const expiresAt = secret.access_token_expires_at ? new Date(secret.access_token_expires_at).getTime() : 0
  if (expiresAt > Date.now() + 60_000) return decryptCalendarToken(secret.access_token_encrypted)
  if (!secret.refresh_token_encrypted) return decryptCalendarToken(secret.access_token_encrypted)

  const refreshed = await refreshCalendarToken(connection.provider, decryptCalendarToken(secret.refresh_token_encrypted))
  const admin = createAdminClient()
  await admin.from("calendar_sync_secrets").update({
    access_token_encrypted: encryptCalendarToken(refreshed.access_token),
    refresh_token_encrypted: refreshed.refresh_token ? encryptCalendarToken(refreshed.refresh_token) : secret.refresh_token_encrypted,
    access_token_expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("connection_id", connection.id)
  return refreshed.access_token
}

export async function syncCalendarConnection(connectionId: string, userId: string) {
  const admin = createAdminClient()
  const { data: connection } = await admin.from("calendar_sync_connections").select("id, provider, user_id, matter_id, external_calendar_id, status").eq("id", connectionId).eq("user_id", userId).maybeSingle()
  if (!connection || !connection.matter_id || !connection.external_calendar_id || connection.status !== "connected") throw new Error("That calendar connection is not ready to sync.")

  const { data: secret } = await admin.from("calendar_sync_secrets").select("access_token_encrypted, refresh_token_encrypted, access_token_expires_at").eq("connection_id", connection.id).maybeSingle()
  if (!secret) throw new Error("The calendar connection has no server-side token. Reconnect the account.")

  try {
    const accessToken = await getUsableAccessToken(connection as CalendarConnection, secret)
    const { data: appointments } = await admin.from("appointments").select("id, matter_id, title, starts_at, ends_at, status, workflow_key, location").eq("matter_id", connection.matter_id).neq("status", "cancelled").order("starts_at", { ascending: true }).limit(500)
    const { data: existingEvents } = await admin.from("calendar_sync_events").select("id, appointment_id, external_event_id").eq("connection_id", connection.id)
    const existingByAppointment = new Map((existingEvents ?? []).map((event) => [event.appointment_id, event]))
    let created = 0
    let updated = 0

    for (const appointment of (appointments ?? []) as Appointment[]) {
      const existing = existingByAppointment.get(appointment.id)
      const external = await pushEvent(connection.provider as CalendarProvider, accessToken, connection.external_calendar_id, appointment, existing?.external_event_id)
      await admin.from("calendar_sync_events").upsert({
        connection_id: connection.id,
        matter_id: appointment.matter_id,
        appointment_id: appointment.id,
        external_event_id: external.id,
        external_etag: external.etag,
        last_pushed_at: new Date().toISOString(),
      }, { onConflict: "connection_id,appointment_id" })
      if (existing) updated += 1
      else created += 1
    }

    await admin.from("calendar_sync_connections").update({ status: "connected", last_sync_at: new Date().toISOString(), error_message: null, updated_at: new Date().toISOString() }).eq("id", connection.id)
    return { created, updated, total: created + updated }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar synchronization failed."
    await admin.from("calendar_sync_connections").update({ status: "error", error_message: message, updated_at: new Date().toISOString() }).eq("id", connection.id)
    throw new Error(message)
  }
}
