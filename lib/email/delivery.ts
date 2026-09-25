import "server-only"

import { isTransactionalEmailConfigured, sendTransactionalEmail } from "@/lib/email/resend"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_ATTEMPTS = 3

export async function deliverQueuedAppointmentEmails() {
  if (!isTransactionalEmailConfigured()) {
    return { status: "not_configured" as const, claimed: 0, sent: 0, requeued: 0, failed: 0 }
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data: claimed, error: claimError } = await admin.rpc("claim_matterpilot_email_communications", { p_now: now, p_limit: 20 })
  if (claimError) throw claimError

  let sent = 0
  let requeued = 0
  let failed = 0

  for (const communication of claimed ?? []) {
    const result = await sendTransactionalEmail({
      communicationId: communication.id,
      recipient: communication.recipient ?? "",
      subject: communication.subject ?? "MatterPilot message",
      body: communication.body,
    })

    if (result.ok) {
      const { error } = await admin
        .from("appointment_communications")
        .update({ status: "sent", provider: result.provider, provider_message_id: result.messageId, provider_response: result.response, sent_at: new Date().toISOString(), error_message: null, updated_at: new Date().toISOString() })
        .eq("id", communication.id)
        .eq("status", "sending")
      if (error) throw error
      sent += 1
      continue
    }

    const shouldRetry = result.retryable && communication.attempt_count < MAX_ATTEMPTS
    const nextAttemptAt = new Date(Date.now() + Math.min(60, 5 * 2 ** Math.max(0, communication.attempt_count - 1)) * 60_000).toISOString()
    const { error } = await admin
      .from("appointment_communications")
      .update({ status: shouldRetry ? "queued" : "failed", next_attempt_at: nextAttemptAt, provider: "resend", provider_response: result.response, error_message: result.error.slice(0, 1000), updated_at: new Date().toISOString() })
      .eq("id", communication.id)
      .eq("status", "sending")
    if (error) throw error

    if (shouldRetry) requeued += 1
    else failed += 1
  }

  return { status: "completed" as const, claimed: claimed?.length ?? 0, sent, requeued, failed }
}
