import "server-only"

import { openai } from "@ai-sdk/openai"
import { Output, generateText } from "ai"
import { z } from "zod"

// Direct OpenAI provider (not the Vercel AI Gateway): the Gateway account
// requires a credit card on file before it will service any request, so
// this calls OpenAI directly with OPENAI_API_KEY. Model verified against
// the live `GET https://api.openai.com/v1/models` catalog — verify there
// before changing it, never from memory.
const MODEL_ID = process.env.OPENAI_MODEL ?? "gpt-5.1"
const MODEL = openai(MODEL_ID)

const CONCLUSION_CLASSIFICATIONS = [
  "source_reported_assertion",
  "analyst_inference",
  "hypothesis",
  "disputed",
  "unknown",
] as const

/**
 * Deliberately excludes "verified_fact": the model must never self-assign
 * that classification (see the system prompt below). Only a human reviewer
 * editing a draft afterward can mark something verified, and only the
 * database's own audit trail — never model output — should be trusted for
 * that judgment.
 */
const analysisDraftSchema = z.object({
  summary: z.string().describe("One or two sentence neutral summary of what this analysis addresses."),
  conclusions: z
    .array(
      z.object({
        text: z.string(),
        classification: z.enum(CONCLUSION_CLASSIFICATIONS),
        evidenceIds: z
          .array(z.string())
          .describe(
            "Evidence numbers (e.g. EV-003) this conclusion is grounded in. Must exactly match an evidence number given in the input. Leave empty if no specific evidence item supports this conclusion — never invent one."
          ),
      })
    )
    .describe("Discrete, individually classified claims. Each one must be traceable to the provided material."),
  contradictoryOrAdverseEvidence: z
    .string()
    .describe("Evidence or statements that cut against or complicate the working theory, stated neutrally."),
  unknownsAndLimitations: z
    .string()
    .describe("What remains unknown, unverified, or outside what the provided material can establish."),
  suggestedNextAction: z.string().describe("One concrete, human-verifiable next investigative step."),
})

export type AnalysisDraft = z.infer<typeof analysisDraftSchema>

export type EvidenceContext = {
  evidenceNumber: string
  title: string
  artifactType: string
  sourceLocator: string | null
  eventDate: string | null
  provenanceStatus: string
  authenticationStatus: string
  relationship: string
  annotations: string[]
}

export type StatementContext = {
  content: string
  subjectName: string | null
  status: string
}

export type AnalysisGenerationInput = {
  questionPrompt: string
  propositionStatement: string | null
  evidence: EvidenceContext[]
  statements: StatementContext[]
}

const SYSTEM_PROMPT = `You are an evidence-grounded litigation analysis assistant for TraceLine, a defense-litigation investigation workspace. You draft a first-pass structured analysis for a human attorney or investigator to review — you never produce a final conclusion yourself.

Hard rules, no exceptions:
- Use ONLY the evidence, statements, and annotations given to you below. Never invent people, events, records, quotes, sources, relationships, intent, criminality, deception, diagnosis, motive, or character judgments that are not present in the provided material.
- You have metadata (title, type, dates, source, provenance/authentication status) for each evidence item, and real text only where a statement or annotation is explicitly provided. Do not invent or guess the contents of any evidence item you were not given text for.
- Never classify a conclusion as a verified fact. That classification does not exist in your output schema for a reason — leave that judgment to a human reviewer.
- Never state or imply that a witness is lying, dishonest, or unreliable. If accounts conflict, describe the conflict neutrally (e.g. "materially different descriptions were identified") and let a human assess credibility.
- Every conclusion must cite the evidence numbers (exactly as given, e.g. "EV-004") that support it, or cite none if it is a general inference not tied to a specific item — never fabricate an evidence number.
- If the provided material is insufficient to say something with confidence, say so explicitly in unknowns and limitations rather than filling the gap with a guess.`

function buildUserPrompt(input: AnalysisGenerationInput): string {
  const lines: string[] = []
  lines.push(`Question: ${input.questionPrompt}`)
  if (input.propositionStatement) {
    lines.push(`Proposition being analyzed: ${input.propositionStatement}`)
  }
  lines.push("")
  lines.push("Evidence on record (metadata; text included only where explicitly noted):")
  if (input.evidence.length === 0) {
    lines.push("(none linked yet)")
  }
  for (const e of input.evidence) {
    lines.push(
      `- ${e.evidenceNumber} — ${e.title} (${e.artifactType}${e.sourceLocator ? `, ${e.sourceLocator}` : ""}${e.eventDate ? `, ${e.eventDate}` : ""}); relationship: ${e.relationship}; provenance: ${e.provenanceStatus}; authentication: ${e.authenticationStatus}`
    )
    for (const note of e.annotations) {
      lines.push(`    Analyst annotation: ${note}`)
    }
  }
  lines.push("")
  lines.push("Statements on record (verbatim text):")
  if (input.statements.length === 0) {
    lines.push("(none linked yet)")
  }
  for (const s of input.statements) {
    lines.push(`- ${s.subjectName ?? "Unknown subject"} (${s.status}): "${s.content}"`)
  }

  return lines.join("\n")
}

export async function generateAnalysisDraft(
  input: AnalysisGenerationInput
): Promise<{ draft: AnalysisDraft; model: string; droppedEvidenceIds: string[] }> {
  const validEvidenceNumbers = new Set(input.evidence.map((e) => e.evidenceNumber))

  const { output } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
    output: Output.object({ schema: analysisDraftSchema }),
  })

  // Hallucination guard: strip any evidence ID the model cited that was not
  // actually in the material we gave it, rather than trust the schema
  // constraint alone to have been followed.
  const droppedEvidenceIds: string[] = []
  const cleanedConclusions = output.conclusions.map((c) => {
    const kept = c.evidenceIds.filter((id) => {
      const ok = validEvidenceNumbers.has(id)
      if (!ok) droppedEvidenceIds.push(id)
      return ok
    })
    return { ...c, evidenceIds: kept }
  })

  return {
    draft: { ...output, conclusions: cleanedConclusions },
    model: MODEL_ID,
    droppedEvidenceIds: Array.from(new Set(droppedEvidenceIds)),
  }
}
