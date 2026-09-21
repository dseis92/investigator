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
 *
 * Writes go through the log_audit_event() RPC, not a direct table insert —
 * ordinary authenticated clients no longer have INSERT on audit_events at
 * all (see migration 20260921114010_audit_integrity.sql). The function
 * derives actor_id from auth.uid() and created_at from now() server-side, so
 * neither can be spoofed by a caller, including this one.
 */
export async function logAuditEvent(input: LogAuditEventInput) {
  const supabase = await createClient()

  const { error } = await supabase.rpc("log_audit_event", {
    p_matter_id: input.matterId,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_action: input.action,
    p_summary: input.summary,
    p_previous_value: (input.previousValue ?? null) as never,
    p_new_value: (input.newValue ?? null) as never,
  })

  if (error) {
    console.error("Failed to log audit event", error)
  }
}
