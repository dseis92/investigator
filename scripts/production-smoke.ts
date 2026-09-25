type Check = {
  name: string
  path: string
  expected: number[]
}

export {}

const configuredBase = process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
const base = new URL(configuredBase)
base.pathname = "/"
base.search = ""
base.hash = ""

const checks: Check[] = [
  { name: "health endpoint", path: "/api/health", expected: [200] },
  { name: "sign-in page", path: "/auth/login", expected: [200] },
  { name: "public booking page", path: "/book/demo", expected: [200] },
  { name: "protected operations page", path: "/matterpilot", expected: [200, 307, 308] },
  { name: "protected portal page", path: "/portal", expected: [200, 307, 308] },
  { name: "cron protection", path: "/api/matterpilot/cron/operations", expected: [401, 403] },
]

console.log(`Checking ${checks.length} production boundaries at ${base.origin}`)

let failures = 0

for (const check of checks) {
  const url = new URL(check.path, base)

  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "matterpilot-production-smoke/1.0" },
    })

    const requestId = response.headers.get("x-request-id")

    if (check.expected.includes(response.status) && requestId) {
      console.log(`PASS ${check.name} (${response.status}, request ${requestId})`)
      continue
    }

    failures += 1
    const statusMessage = `received ${response.status}, expected ${check.expected.join(" or ")}`
    const requestMessage = requestId ? "request ID present" : "missing x-request-id"
    console.error(`FAIL ${check.name}: ${statusMessage}; ${requestMessage}`)
  } catch (error) {
    failures += 1
    const message = error instanceof Error ? error.message : "request failed"
    console.error(`FAIL ${check.name}: ${message}`)
  }
}

if (failures > 0) {
  console.error(`${failures} smoke check${failures === 1 ? "" : "s"} failed.`)
  process.exitCode = 1
} else {
  console.log("All production smoke checks passed.")
}
