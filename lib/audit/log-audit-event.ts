import { createClient } from "@/lib/supabase/server"
import type { AuditEvent } from "@/lib/domain"

type LogAuditEventInput = {
  matterId: string
  entityType: AuditEvent["entity_type"]
  entityId: string
  action: AuditEvent["action"]
  summary: string
  previousValue?: unknown
  newValue?: unknown
}

/**
 * Every mutating Server Action in the app calls this after a successful
 * write so the Matter Command Center's activity feed and any future
 * correction/exclusion history stay complete. Failures here are logged but
 * never block the underlying mutation from returning success.
 */
export async function logAuditEvent(input: LogAuditEventInput) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  const { error } = await supabase.from("audit_events").insert({
    matter_id: input.matterId,
    actor_id: (claims?.sub as string | undefined) ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    summary: input.summary,
    previous_value: (input.previousValue ?? null) as never,
    new_value: (input.newValue ?? null) as never,
  })

  if (error) {
    console.error("Failed to log audit event", error)
  }
}
