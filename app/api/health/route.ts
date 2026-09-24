import { getEnvironmentStatus } from "@/lib/env"

export const runtime = "nodejs"

export function GET() {
  const environment = getEnvironmentStatus()
  const ready = environment.supabase

  return Response.json(
    {
      status: ready ? "ok" : "degraded",
      service: "matterpilot",
      environment: {
        supabase: environment.supabase ? "configured" : "missing",
        openai: environment.openai ? "configured" : "not_configured",
        model: environment.model,
      },
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
