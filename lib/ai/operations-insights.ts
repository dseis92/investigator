import "server-only"

import { openai } from "@ai-sdk/openai"
import { Output, generateText } from "ai"
import { z } from "zod"

const modelId = process.env.OPENAI_MODEL ?? "gpt-5.1"

const insightSchema = z.object({
  headline: z.string().describe("A neutral one-sentence headline for the human reviewer."),
  summary: z.string().describe("A concise evidence-limited summary of the operational picture."),
  priorities: z.array(z.string()).max(6).describe("Concrete next actions, each phrased as a task for a human team member."),
  risks: z.array(z.string()).max(6).describe("Open risks or unknowns; never invent facts."),
  questions: z.array(z.string()).max(6).describe("Questions the attorney or investigator should answer next."),
  citedRecords: z.array(z.string()).max(12).describe("Exact record labels from the input that support the draft."),
})

export type OperationsInsightInput = {
  runType: string
  matter: { name: string; matter_number: string; case_mode: string; status: string }
  deadlines: { title: string; kind: string; due_at: string; priority: string; status: string }[]
  tasks: { label: string; status: string; is_blocking: boolean; due_at: string | null }[]
  contacts: { display_name: string; contact_type: string }[]
  appointments: { title: string; starts_at: string; status: string; client_name: string | null }[]
  events: { title: string; event_start: string; category: string | null }[]
}

export async function generateOperationsInsight(input: OperationsInsightInput): Promise<{ output: z.infer<typeof insightSchema>; model: string }> {
  if (!process.env.OPENAI_API_KEY) throw new Error("AI assistance is not configured. Add OPENAI_API_KEY to enable drafts.")
  const safeInput = {
    runType: input.runType,
    matter: input.matter,
    deadlines: input.deadlines,
    tasks: input.tasks,
    contacts: input.contacts.map((contact) => ({ role: contact.contact_type })),
    appointments: input.appointments.map((appointment) => ({ title: appointment.title, starts_at: appointment.starts_at, status: appointment.status })),
    events: input.events,
  }
  const { output } = await generateText({
    model: openai(modelId),
    system: `You are MatterPilot's operations assistant. Produce a conservative draft for a licensed legal professional. Use only the structured records supplied. Do not give legal advice, predict outcomes, infer intent, judge credibility, or invent deadlines. Do not repeat personal names or email addresses. Every item in citedRecords must match an exact title or label from the input. Clearly state unknowns. This is a draft requiring human review.`,
    prompt: `Create a ${input.runType.replaceAll("_", " ")} draft from this matter data:\n${JSON.stringify(safeInput, null, 2)}`,
    output: Output.object({ schema: insightSchema }),
  })
  return { output, model: modelId }
}
