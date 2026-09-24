import { createClient } from "@/lib/supabase/server"

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

function formatIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return new Response("Unauthorized", { status: 401 })

  const url = new URL(request.url)
  const matterId = url.searchParams.get("matterId")
  const from = url.searchParams.get("from")
  const until = url.searchParams.get("until")
  let query = supabase
    .from("appointments")
    .select("id, matter_id, title, starts_at, ends_at, location, notes, client_name, status")
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })
    .limit(500)

  if (matterId) query = query.eq("matter_id", matterId)
  if (from) query = query.gte("starts_at", from)
  if (until) query = query.lte("starts_at", until)

  let notesQuery = supabase
    .from("calendar_notes")
    .select("id, matter_id, title, note, starts_at, ends_at")
    .order("starts_at", { ascending: true })
    .limit(500)

  if (matterId) notesQuery = notesQuery.eq("matter_id", matterId)
  if (from) notesQuery = notesQuery.gte("starts_at", from)
  if (until) notesQuery = notesQuery.lte("starts_at", until)

  const [{ data: appointments, error }, { data: notes, error: notesError }] = await Promise.all([query, notesQuery])
  if (error || notesError) return new Response("Unable to export calendar", { status: 500 })

  const now = formatIcsDate(new Date().toISOString())
  const appointmentEvents = (appointments ?? []).map((appointment) => {
    const description = [appointment.client_name, appointment.notes].filter(Boolean).join(" — ")
    return [
      "BEGIN:VEVENT",
      `UID:${appointment.id}@matterpilot.app`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(appointment.starts_at)}`,
      `DTEND:${formatIcsDate(appointment.ends_at)}`,
      `SUMMARY:${escapeIcs(appointment.title)}`,
      appointment.location ? `LOCATION:${escapeIcs(appointment.location)}` : null,
      description ? `DESCRIPTION:${escapeIcs(description)}` : null,
      `STATUS:${appointment.status === "tentative" ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    ].filter(Boolean).join("\r\n")
  })
  const noteEvents = (notes ?? []).map((note) => [
    "BEGIN:VEVENT",
    `UID:${note.id}@matterpilot.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(note.starts_at)}`,
    `DTEND:${formatIcsDate(note.ends_at)}`,
    `SUMMARY:${escapeIcs(`Note: ${note.title}`)}`,
    `DESCRIPTION:${escapeIcs(note.note)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\r\n"))
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MatterPilot//Legal operations calendar//EN", "CALSCALE:GREGORIAN", ...appointmentEvents, ...noteEvents, "END:VCALENDAR", ""].join("\r\n")

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=matterpilot-calendar.ics",
      "Cache-Control": "private, no-store",
    },
  })
}
