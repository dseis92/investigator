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
  const clientName = String(formData.get("client_name") ?? "").trim()
  const clientEmail = String(formData.get("client_email") ?? "").trim().toLowerCase()
  const clientPhone = String(formData.get("client_phone") ?? "").trim()

  if (!matterNumber || !name || !caseMode) {
    return { error: "Matter number, name, and case mode are required." }
  }
  if (clientEmail && !clientEmail.includes("@")) {
    return { error: "Enter a valid client email address or leave it blank." }
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

  if (clientName) {
    const { error: clientUpdateError } = await supabase.from("matters").update({
      client_name: clientName,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      conflict_status: "pending",
      engagement_status: "not_started",
    }).eq("id", data.id)
    if (clientUpdateError) return { error: `Matter created, but the client identity could not be saved: ${clientUpdateError.message}` }

    const { error: contactError } = await supabase.from("matter_contacts").insert({
      matter_id: data.id,
      display_name: clientName,
      contact_type: "prospective_client",
      email: clientEmail || null,
      phone: clientPhone || null,
      notes: "Created from new-matter client intake.",
      created_by: userData.user.id,
      updated_at: new Date().toISOString(),
    })
    if (contactError) return { error: `Matter created, but the client contact could not be saved: ${contactError.message}` }

    const [{ data: contactMatches }, { data: subjectMatches }] = await Promise.all([
      supabase.from("matter_contacts").select("matter_id, display_name, contact_type, email").neq("matter_id", data.id).ilike("display_name", clientName).limit(20),
      supabase.from("subjects").select("matter_id, display_name, subject_type").neq("matter_id", data.id).ilike("display_name", clientName).limit(20),
    ])
    const matches = [...(contactMatches ?? []).map((match) => ({ matterId: match.matter_id, label: match.display_name, kind: "contact" })), ...(subjectMatches ?? []).map((match) => ({ matterId: match.matter_id, label: match.display_name, kind: match.subject_type }))]
    const relatedMatterIds = [...new Set(matches.map((match) => match.matterId))]
    const { data: relatedMatters } = relatedMatterIds.length ? await supabase.from("matters").select("id, name, matter_number").in("id", relatedMatterIds) : { data: [] }
    const matterNames = new Map((relatedMatters ?? []).map((matter) => [matter.id, `${matter.name} (${matter.matter_number})`]))
    const conflictStatus = matches.length ? "possible_conflict" : "clear"
    const conflictNote = matches.length
      ? `Possible match${matches.length === 1 ? "" : "es"}: ${matches.slice(0, 5).map((match) => `${match.label} in ${matterNames.get(match.matterId) ?? "another accessible matter"}`).join("; ")}. Review before confirming representation.`
      : "No matching contact or subject was found in the matters currently accessible to you. Review remains a human responsibility."
    await supabase.from("matters").update({ conflict_status: conflictStatus, conflict_note: conflictNote }).eq("id", data.id)
  }

  redirect(`/matters/${data.id}`)
}
