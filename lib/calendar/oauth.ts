import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto"

export type CalendarProvider = "google" | "outlook"

type CalendarTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

export type CalendarAccount = {
  email: string | null
  calendarId: string
  calendarName: string
}

const providerConfig = {
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authorizeEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "https://www.googleapis.com/auth/calendar.events"],
  },
  outlook: {
    clientId: () => process.env.MICROSOFT_CLIENT_ID,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET,
    authorizeEndpoint: () => `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/authorize`,
    tokenEndpoint: () => `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/token`,
    scopes: ["openid", "email", "offline_access", "Calendars.ReadWrite"],
  },
} as const

function configFor(provider: CalendarProvider) {
  return providerConfig[provider]
}

export function getCalendarRedirectUri(provider: CalendarProvider) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
  return `${siteUrl}/api/matterpilot/calendar/${provider}/callback`
}

export function isCalendarProviderConfigured(provider: CalendarProvider) {
  const config = configFor(provider)
  return Boolean(config.clientId() && config.clientSecret() && process.env.CALENDAR_TOKEN_ENCRYPTION_KEY && process.env.NEXT_PUBLIC_SITE_URL)
}

export function buildCalendarAuthorizationUrl(provider: CalendarProvider, state: string) {
  const config = configFor(provider)
  const clientId = config.clientId()
  if (!clientId) throw new Error(`${provider} OAuth client ID is not configured.`)

  const authorizeEndpoint = typeof config.authorizeEndpoint === "function" ? config.authorizeEndpoint() : config.authorizeEndpoint
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getCalendarRedirectUri(provider),
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  })
  if (provider === "google") {
    params.set("access_type", "offline")
    params.set("prompt", "consent")
  } else {
    params.set("response_mode", "query")
  }
  return `${authorizeEndpoint}?${params.toString()}`
}

export function hashOAuthState(state: string) {
  return createHash("sha256").update(state).digest("hex")
}

export function oauthStateMatches(state: string, expectedHash: string | null) {
  if (!expectedHash) return false
  const actual = Buffer.from(hashOAuthState(state), "hex")
  const expected = Buffer.from(expectedHash, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function encryptionKey() {
  const configured = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY
  if (!configured) throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not configured.")
  return createHash("sha256").update(configured).digest()
}

export function encryptCalendarToken(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".")
}

export function decryptCalendarToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".")
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Encrypted calendar token is malformed.")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8")
}

async function readJson(response: Response, message: string) {
  const payload = await response.json().catch(() => null) as { error?: string; error_description?: string } | null
  if (!response.ok) throw new Error(payload?.error_description || payload?.error || message)
  return payload
}

export async function exchangeCalendarCode(provider: CalendarProvider, code: string): Promise<CalendarTokenResponse> {
  const config = configFor(provider)
  const clientId = config.clientId()
  const clientSecret = config.clientSecret()
  if (!clientId || !clientSecret) throw new Error(`${provider} OAuth credentials are not configured.`)
  const tokenEndpoint = typeof config.tokenEndpoint === "function" ? config.tokenEndpoint() : config.tokenEndpoint
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getCalendarRedirectUri(provider),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  })
  return await readJson(response, "The calendar provider rejected the OAuth code.") as CalendarTokenResponse
}

export async function refreshCalendarToken(provider: CalendarProvider, refreshToken: string) {
  const config = configFor(provider)
  const clientId = config.clientId()
  const clientSecret = config.clientSecret()
  if (!clientId || !clientSecret) throw new Error(`${provider} OAuth credentials are not configured.`)
  const tokenEndpoint = typeof config.tokenEndpoint === "function" ? config.tokenEndpoint() : config.tokenEndpoint
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  })
  return await readJson(response, "The calendar provider could not refresh the connection.") as CalendarTokenResponse
}

export async function fetchCalendarAccount(provider: CalendarProvider, accessToken: string): Promise<CalendarAccount> {
  if (provider === "google") {
    const [profileResponse, calendarsResponse] = await Promise.all([
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
      fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer&showDeleted=false", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
    ])
    const profile = await readJson(profileResponse, "Google account details could not be read.") as { email?: string }
    const calendars = await readJson(calendarsResponse, "Google calendars could not be read.") as { items?: { id: string; summary?: string; primary?: boolean }[] }
    const calendar = calendars.items?.find((item) => item.primary) ?? calendars.items?.[0]
    return { email: profile.email ?? null, calendarId: calendar?.id ?? "primary", calendarName: calendar?.summary ?? "Primary calendar" }
  }

  const [profileResponse, calendarResponse] = await Promise.all([
    fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
    fetch("https://graph.microsoft.com/v1.0/me/calendar", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
  ])
  const profile = await readJson(profileResponse, "Microsoft account details could not be read.") as { mail?: string; userPrincipalName?: string }
  const calendar = await readJson(calendarResponse, "The Outlook calendar could not be read.") as { id?: string; name?: string }
  if (!calendar.id) throw new Error("The Outlook account did not return a default calendar.")
  return { email: profile.mail || profile.userPrincipalName || null, calendarId: calendar.id, calendarName: calendar.name || "Calendar" }
}
