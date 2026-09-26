"use server"

import { redirect } from "next/navigation"

import { parseMatterStarterTemplates } from "@/lib/matterpilot/customizations"
import { createClient } from "@/lib/supabase/server"

export type CreateMatterState = { error: string | null }

export async function createMatter(_prevState: CreateMatterState, formData: FormData): Promise<CreateMatterState> {
  const matterNumber = String(formData.get("matter_number") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const caseMode = String(formData.get("case_mode") ?? "")
  const jurisdiction = String(formData.get("jurisdiction") ?? "").trim() || undefined
  const venue = String(formData.get("venue") ?? "").trim() || undefined
  const onboardingTemplateId = String(formData.get("onboarding_template_id") ?? "").trim()

  if (!matterNumber || !name || !caseMode) {
    return { error: "Matter number, name, and case mode are required." }
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: "Please sign in before creating a matter." }

  let onboardingTemplate = null
  if (onboardingTemplateId) {
    const { data: preferenceRow } = await supabase.from("user_preferences").select("preferences").eq("user_id", userData.user.id).maybeSingle()
    const preferences = preferenceRow?.preferences && typeof preferenceRow.preferences === "object" && !Array.isArray(preferenceRow.preferences)
      ? preferenceRow.preferences as Record<string, unknown>
      : {}
    onboardingTemplate = parseMatterStarterTemplates(preferences.matterTemplates).find((template) => template.id === onboardingTemplateId && template.active) ?? null
  }
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

  if (onboardingTemplate) {
    const matterUpdates: { status?: string; practice_area?: string } = {}
    if (onboardingTemplate.defaultStatus === "on_hold") matterUpdates.status = onboardingTemplate.defaultStatus
    if (onboardingTemplate.practiceArea) matterUpdates.practice_area = onboardingTemplate.practiceArea
    if (Object.keys(matterUpdates).length) {
      const { error: matterUpdateError } = await supabase.from("matters").update(matterUpdates).eq("id", data.id)
      if (matterUpdateError) return { error: `Matter created, but its onboarding defaults could not be applied: ${matterUpdateError.message}` }
    }

    if (onboardingTemplate.intakeQuestions.length) {
      const { error: questionError } = await supabase.from("questions").insert(onboardingTemplate.intakeQuestions.map((prompt) => ({
        matter_id: data.id,
        prompt,
        priority: "medium",
        status: "open",
        created_by: userData.user.id,
      })))
      if (questionError) return { error: `Matter created, but its intake questions could not be added: ${questionError.message}` }
    }

    const onboardingItems = [
      ...onboardingTemplate.preparationTasks.map((title) => ({ item_type: "task", title })),
      ...onboardingTemplate.documentRequests.map((title) => ({ item_type: "document", title })),
    ]
    if (onboardingItems.length) {
      const { error: onboardingError } = await supabase.from("matter_onboarding_items").insert(onboardingItems.map((item) => ({
        matter_id: data.id,
        item_type: item.item_type,
        title: item.title,
        is_required: true,
        created_by: userData.user.id,
      })))
      if (onboardingError) return { error: `Matter created, but its onboarding checklist could not be added: ${onboardingError.message}` }
    }
  }

  redirect(`/matters/${data.id}`)
}
