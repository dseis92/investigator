import { createClient } from "@/lib/supabase/server"
import type { MatterRole } from "@/lib/domain"

/**
 * Reads the current user's role on a matter. This is a UX convenience for
 * rendering disabled buttons with a clear explanation — RLS (is_matter_member
 * / has_matter_role in the DB) is the actual enforcement boundary, not this
 * function. Every sensitive Server Action must still rely on RLS to reject
 * unauthorized writes even if this check were somehow bypassed client-side.
 */
export async function getMatterRole(matterId: string): Promise<MatterRole | null> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims) return null

  const { data } = await supabase
    .from("matter_members")
    .select("role")
    .eq("matter_id", matterId)
    .eq("user_id", claims.sub as string)
    .maybeSingle()

  return (data?.role as MatterRole | undefined) ?? null
}

export function canManageMembers(role: MatterRole | null) {
  return role === "attorney" || role === "admin"
}

export function canExcludeEvidence(role: MatterRole | null) {
  return role === "attorney" || role === "admin" || role === "investigator"
}

/** Same role set as canExcludeEvidence — mirrors the database's analysis_finalization_role_guard trigger. */
export function canFinalizeAnalysis(role: MatterRole | null) {
  return role === "attorney" || role === "admin" || role === "investigator"
}
