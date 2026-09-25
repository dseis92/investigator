import "server-only"

import { renderMatterPilotEmail } from "@/lib/email/templates"
import type { Json } from "@/lib/supabase/types"

type DeliveryInput = {
  communicationId: string
  recipient: string
  subject: string
  body: string
}

type SafeProviderResponse = { [key: string]: Json | undefined }

function safeProviderResponse(input: Record<string, unknown>): SafeProviderResponse {
  const output: SafeProviderResponse = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      output[key] = value
    }
  }
  return output
}

export type EmailProviderResult =
  | { ok: true; provider: "resend"; messageId: string; response: SafeProviderResponse }
  | { ok: false; retryable: boolean; error: string; status: number | null; response: SafeProviderResponse }

export function isTransactionalEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
}

export async function sendTransactionalEmail(input: DeliveryInput): Promise<EmailProviderResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    return { ok: false, retryable: false, error: "Transactional email is not configured.", status: null, response: {} }
  }

  const rendered = renderMatterPilotEmail({ subject: input.subject, body: input.body })
  const payload = {
    from,
    to: [input.recipient],
    subject: input.subject,
    html: rendered.html,
    text: rendered.text,
    ...(process.env.RESEND_REPLY_TO ? { reply_to: process.env.RESEND_REPLY_TO } : {}),
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `matterpilot/communication/${input.communicationId}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    })
    const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>

    if (response.ok && typeof responseBody.id === "string") {
      return { ok: true, provider: "resend", messageId: responseBody.id, response: safeProviderResponse(responseBody) }
    }

    const providerMessage = typeof responseBody.message === "string" ? responseBody.message : "The email provider rejected the message."
    return {
      ok: false,
      retryable: response.status === 408 || response.status === 409 || response.status >= 500,
      error: providerMessage,
      status: response.status,
      response: safeProviderResponse(responseBody),
    }
  } catch (error) {
    return {
      ok: false,
      retryable: true,
      error: error instanceof Error ? error.message : "The email provider could not be reached.",
      status: null,
      response: {},
    }
  }
}
