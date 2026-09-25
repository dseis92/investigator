const requestIdPattern = /^[A-Za-z0-9._-]{8,128}$/

export function getRequestId(candidate: string | null | undefined): string {
  return candidate && requestIdPattern.test(candidate) ? candidate : crypto.randomUUID()
}

export function logHttpRequest(input: {
  requestId: string
  method: string
  pathname: string
  status: number
  durationMs: number
}) {
  console.info(
    JSON.stringify({
      event: "http_request",
      request_id: input.requestId,
      method: input.method,
      pathname: input.pathname,
      status: input.status,
      duration_ms: Math.round(input.durationMs),
    })
  )
}
