import { createClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) return null

  return {
    id: claims.sub as string,
    email: (claims.email as string | undefined) ?? null,
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Not authenticated")
  }
  return user
}
