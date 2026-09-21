"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type CreateMatterState = { error: string | null }

export async function createMatter(_prevState: CreateMatterState, formData: FormData): Promise<CreateMatterState> {
  const matterNumber = String(formData.get("matter_number") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const caseMode = String(formData.get("case_mode") ?? "")
  const jurisdiction = String(formData.get("jurisdiction") ?? "").trim() || undefined
  const venue = String(formData.get("venue") ?? "").trim() || undefined

  if (!matterNumber || !name || !caseMode) {
    return { error: "Matter number, name, and case mode are required." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_matter", {
    p_matter_number: matterNumber,
    p_name: name,
    p_case_mode: caseMode,
    p_jurisdiction: jurisdiction,
    p_venue: venue,
  })

  if (error) {
    return { error: error.message }
  }

  redirect(`/matters/${data.id}`)
}
