import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib"

import type { MatrixRow } from "@/components/reports/proposition-evidence-matrix-table"
import type {
  ReportEvidenceRef,
  WitnessReportEntry,
} from "@/components/reports/witness-contradiction-report"

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 48
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BOTTOM = 52

const palette = {
  ink: rgb(0.14, 0.19, 0.23),
  muted: rgb(0.39, 0.42, 0.4),
  accent: rgb(0.71, 0.31, 0.19),
  accentSoft: rgb(0.97, 0.92, 0.88),
  rule: rgb(0.86, 0.84, 0.8),
  white: rgb(1, 1, 1),
}

export type PdfReportSection = {
  heading: string
  body?: string
  items?: { label: string; detail: string; tone?: "normal" | "warn" | "good" }[]
}

function safePdfText(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("…", "...")
    .replaceAll("·", "-")
    .replace(/[^\x20-\x7E\n\t]/g, "?")
}

function wrapText(value: string, font: PDFFont, size: number, width: number) {
  return safePdfText(value)
    .split("\n")
    .flatMap((paragraph) => {
      if (!paragraph.trim()) return [""]
      const lines: string[] = []
      let current = ""
      for (const word of paragraph.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word
        if (font.widthOfTextAtSize(candidate, size) <= width || !current) {
          current = candidate
        } else {
          lines.push(current)
          current = word
        }
      }
      if (current) lines.push(current)
      return lines
    })
}

class PdfRenderer {
  private readonly pages: PDFPage[] = []
  private page!: PDFPage
  private y = 0

  private constructor(
    private readonly document: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly matterName: string,
    private readonly matterNumber: string,
    private readonly reportTitle: string,
    private readonly generatedAt: string,
  ) {}

  static async create(input: {
    matterName: string
    matterNumber: string
    reportTitle: string
    generatedAt: string
  }) {
    const document = await PDFDocument.create()
    const renderer = new PdfRenderer(
      document,
      await document.embedFont(StandardFonts.Helvetica),
      await document.embedFont(StandardFonts.HelveticaBold),
      input.matterName,
      input.matterNumber,
      input.reportTitle,
      input.generatedAt,
    )
    renderer.addPage()
    renderer.titlePage()
    return renderer
  }

  private addPage() {
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    this.pages.push(this.page)
    this.y = PAGE_HEIGHT - 88
    this.page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 8, width: PAGE_WIDTH, height: 8, color: palette.accent })
    this.page.drawText("MATTERPILOT", {
      x: MARGIN,
      y: PAGE_HEIGHT - 38,
      size: 9,
      font: this.bold,
      color: palette.accent,
    })
    this.page.drawText("TraceLine defense intelligence", {
      x: MARGIN,
      y: PAGE_HEIGHT - 54,
      size: 8,
      font: this.regular,
      color: palette.muted,
    })
  }

  private titlePage() {
    this.page.drawText(safePdfText(this.reportTitle), {
      x: MARGIN,
      y: this.y,
      size: 22,
      font: this.bold,
      color: palette.ink,
      maxWidth: CONTENT_WIDTH,
    })
    this.y -= 28
    this.page.drawText(safePdfText(this.matterName), {
      x: MARGIN,
      y: this.y,
      size: 12,
      font: this.regular,
      color: palette.muted,
      maxWidth: CONTENT_WIDTH,
    })
    this.y -= 18
    this.page.drawText(`${safePdfText(this.matterNumber)}  |  Generated ${safePdfText(this.generatedAt)}`, {
      x: MARGIN,
      y: this.y,
      size: 9,
      font: this.regular,
      color: palette.muted,
      maxWidth: CONTENT_WIDTH,
    })
    this.y -= 28
    this.rule()
    this.y -= 16
  }

  private ensure(height: number) {
    if (this.y - height < BOTTOM) {
      this.addPage()
    }
  }

  private drawLines(lines: string[], options: { size: number; font: PDFFont; color: ReturnType<typeof rgb>; leading: number }) {
    for (const line of lines) {
      this.ensure(options.leading)
      this.page.drawText(line, {
        x: MARGIN,
        y: this.y,
        size: options.size,
        font: options.font,
        color: options.color,
        maxWidth: CONTENT_WIDTH,
      })
      this.y -= options.leading
    }
  }

  paragraph(value: string, options?: { muted?: boolean; size?: number; after?: number }) {
    const size = options?.size ?? 10
    const leading = size + 4
    this.drawLines(wrapText(value, this.regular, size, CONTENT_WIDTH), {
      size,
      font: this.regular,
      color: options?.muted ? palette.muted : palette.ink,
      leading,
    })
    this.y -= options?.after ?? 8
  }

  heading(value: string, options?: { size?: number; after?: number }) {
    const size = options?.size ?? 13
    this.ensure(size + 18)
    this.page.drawText(safePdfText(value), {
      x: MARGIN,
      y: this.y,
      size,
      font: this.bold,
      color: palette.ink,
      maxWidth: CONTENT_WIDTH,
    })
    this.y -= size + 8
    this.y -= options?.after ?? 5
  }

  label(value: string) {
    this.ensure(18)
    this.page.drawText(safePdfText(value).toUpperCase(), {
      x: MARGIN,
      y: this.y,
      size: 8,
      font: this.bold,
      color: palette.accent,
      maxWidth: CONTENT_WIDTH,
    })
    this.y -= 14
  }

  bullet(value: string) {
    const lines = wrapText(value, this.regular, 9, CONTENT_WIDTH - 14)
    this.ensure(lines.length * 13)
    lines.forEach((line, index) => {
      this.page.drawText(index === 0 ? `- ${line}` : `  ${line}`, {
        x: MARGIN,
        y: this.y,
        size: 9,
        font: this.regular,
        color: palette.ink,
        maxWidth: CONTENT_WIDTH,
      })
      this.y -= 13
    })
    this.y -= 3
  }

  status(value: string) {
    this.ensure(22)
    const text = `STATUS  ${safePdfText(value).toUpperCase()}`
    const width = this.bold.widthOfTextAtSize(text, 8) + 14
    this.page.drawRectangle({ x: MARGIN, y: this.y - 4, width, height: 16, color: palette.accentSoft })
    this.page.drawText(text, { x: MARGIN + 7, y: this.y, size: 8, font: this.bold, color: palette.accent })
    this.y -= 25
  }

  rule() {
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_WIDTH - MARGIN, y: this.y }, thickness: 0.7, color: palette.rule })
  }

  evidence(label: string, items: ReportEvidenceRef[]) {
    this.label(label)
    if (!items.length) {
      this.paragraph("None on record.", { muted: true, size: 9, after: 5 })
      return
    }
    items.forEach((item) => {
      const locator = item.source_locator ? ` (${item.source_locator})` : ""
      const date = item.event_date ? ` | ${item.event_date.slice(0, 10)}` : ""
      this.bullet(`${item.evidence_number} - ${item.title}${locator}${date} | ${item.provenance_status}`)
    })
  }

  finish() {
    this.pages.forEach((page, index) => {
      page.drawLine({ start: { x: MARGIN, y: 36 }, end: { x: PAGE_WIDTH - MARGIN, y: 36 }, thickness: 0.5, color: palette.rule })
      page.drawText("CONFIDENTIAL - ATTORNEY WORK PRODUCT", { x: MARGIN, y: 23, size: 7, font: this.bold, color: palette.muted })
      page.drawText(`MatterPilot  |  ${index + 1} / ${this.pages.length}`, { x: PAGE_WIDTH - 160, y: 23, size: 7, font: this.regular, color: palette.muted })
    })
    return this.document.save()
  }
}

export async function createPropositionEvidenceMatrixPdf(input: {
  matterName: string
  matterNumber: string
  generatedAt: string
  rows: MatrixRow[]
}) {
  const renderer = await PdfRenderer.create({ ...input, reportTitle: "Proposition Evidence Matrix" })
  renderer.paragraph("A proposition-by-proposition review of supporting and contradicting evidence recorded in the matter workspace.", { muted: true })
  if (!input.rows.length) {
    renderer.paragraph("No propositions exist for this matter yet.", { muted: true })
  }
  input.rows.forEach((row, index) => {
    renderer.heading(`${index + 1}. ${row.statement}`)
    renderer.paragraph(`Question: ${row.questionPrompt}`, { muted: true, size: 9, after: 5 })
    renderer.status(row.status)
    renderer.evidence("Supporting evidence", row.supporting as ReportEvidenceRef[])
    renderer.evidence("Contradicting evidence", row.contradicting as ReportEvidenceRef[])
    if (row.assumptions) renderer.paragraph(`Assumptions: ${row.assumptions}`, { muted: true, size: 9, after: 4 })
    if (row.nextAction) renderer.paragraph(`Analyst next action: ${row.nextAction}`, { muted: true, size: 9, after: 4 })
    if (!row.supporting.length && !row.contradicting.length) renderer.paragraph("Limitation: no evidence is linked to this proposition.", { muted: true, size: 9, after: 8 })
    renderer.rule()
    renderer.paragraph("", { size: 4, after: 2 })
  })
  renderer.paragraph("Limitations: this report reflects only propositions and evidence links recorded in TraceLine at generation time. Provenance badges reflect the recorded evidence status, not courtroom authentication.", { muted: true, size: 8, after: 0 })
  return renderer.finish()
}

export async function createWitnessContradictionPdf(input: {
  matterName: string
  matterNumber: string
  generatedAt: string
  witnesses: WitnessReportEntry[]
}) {
  const renderer = await PdfRenderer.create({ ...input, reportTitle: "Witness Contradiction Report" })
  renderer.paragraph("Witness and expert statements, materially different descriptions, cited evidence, and recorded adversarial review questions.", { muted: true })
  if (!input.witnesses.length) renderer.paragraph("No witness or expert subjects with recorded statements exist for this matter yet.", { muted: true })

  input.witnesses.forEach((witness, index) => {
    renderer.heading(`${index + 1}. ${witness.displayName}`, { size: 14 })
    renderer.paragraph(`${witness.subjectType}${witness.summary ? ` - ${witness.summary}` : ""}`, { muted: true, size: 9 })
    if (witness.statements.length) {
      renderer.label("Statements, by date and source")
      witness.statements.forEach((statement) => {
        renderer.paragraph(statement.content, { size: 9, after: 3 })
        renderer.paragraph(`Statement date: ${statement.statementDate ?? "Not recorded"} | Source: ${statement.sourceEvidence.evidence_number} - ${statement.sourceEvidence.title} | Status: ${statement.status}`, { muted: true, size: 8, after: 4 })
        renderer.evidence("Corroborating evidence", statement.corroborating)
        renderer.evidence("Contradictory evidence", statement.contradicting)
      })
    }
    witness.contradictions.forEach((contradiction) => {
      renderer.heading(contradiction.title, { size: 11, after: 3 })
      renderer.paragraph(`${contradiction.conflictType} conflict - ${contradiction.ownLabel} versus ${contradiction.otherLabel}`, { muted: true, size: 8, after: 4 })
      renderer.status(contradiction.resolutionStatus)
      renderer.label(contradiction.ownLabel)
      renderer.paragraph(contradiction.ownSummary, { size: 9, after: 3 })
      renderer.evidence("This side's evidence", contradiction.ownSideEvidence)
      renderer.label(contradiction.otherLabel)
      renderer.paragraph(contradiction.otherSummary, { size: 9, after: 3 })
      renderer.evidence("Other side's evidence", contradiction.otherSideEvidence)
      if (contradiction.plausibleAlternativeExplanations) renderer.paragraph(`Plausible alternative explanations: ${contradiction.plausibleAlternativeExplanations}`, { size: 9, after: 4 })
      if (contradiction.missingEvidence) renderer.paragraph(`Missing evidence that could resolve this: ${contradiction.missingEvidence}`, { size: 9, after: 4 })
      if (contradiction.unresolvedCredibilityQuestions.length) {
        renderer.label("Unresolved questions")
        contradiction.unresolvedCredibilityQuestions.forEach((question) => renderer.bullet(question))
      }
      if (contradiction.examinationTopics.length) {
        renderer.label("Suggested examination topics")
        contradiction.examinationTopics.forEach((topic) => renderer.bullet(topic))
      }
      renderer.rule()
      renderer.paragraph("", { size: 4, after: 2 })
    })
  })
  renderer.paragraph("Limitations: this report reflects only statements, contradictions, and evidence links recorded in TraceLine at generation time. It does not make an auto-generated conclusion about a witness's honesty or reliability.", { muted: true, size: 8, after: 0 })
  return renderer.finish()
}

export async function createDerivedReportPdf(input: {
  matterName: string
  matterNumber: string
  generatedAt: string
  reportTitle: string
  description: string
  sections: PdfReportSection[]
}) {
  const renderer = await PdfRenderer.create({ ...input })
  renderer.paragraph(input.description, { muted: true })

  for (const section of input.sections) {
    renderer.heading(section.heading)
    if (section.body) renderer.paragraph(section.body)
    if (!section.items?.length) {
      if (!section.body) renderer.paragraph("No records on file.", { muted: true, size: 9 })
      continue
    }
    for (const item of section.items) {
      renderer.paragraph(`${item.label}: ${item.detail}`, { size: 9, after: 3 })
      if (item.tone === "warn") renderer.status("Needs review")
      if (item.tone === "good") renderer.status("Covered")
    }
    renderer.rule()
    renderer.paragraph("", { size: 4, after: 2 })
  }

  renderer.paragraph("Limitations: this report reflects only records entered in MatterPilot at generation time. It does not make legal conclusions, authenticate evidence, calculate binding legal deadlines, or replace attorney review.", { muted: true, size: 8, after: 0 })
  return renderer.finish()
}
