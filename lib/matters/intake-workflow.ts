export const INTAKE_REVIEW = "Review completed intake questionnaire"
export const ENGAGEMENT_REVIEW = "Review signed engagement letter"

export type IntakeDocument = {
  id: string
  name: string
  status: string
  draftId: string | null
  draftStatus: string | null
  signatureStatus: string | null
  signatureCurrent?: boolean
  deliveryStatus?: string | null
  updatedAt?: string
}

export function intakeDocumentStage(document: IntakeDocument | undefined) {
  if (!document) return "Not created"
  if (document.status === "signed" && document.signatureStatus === "signed")
    return document.signatureCurrent ? "Signed" : "Signature needs renewal"
  if (document.status === "received") return "Completed"
  if (document.deliveryStatus === "sent") return "Sent to client"
  if (document.deliveryStatus === "queued") return "Email queued"
  if (document.draftStatus === "final") return "Approved for sharing"
  if (document.draftId) return "Draft"
  return "Requested"
}

export function intakeBlockers(input: {
  clientName: string | null
  conflictReviewed: boolean
  documents: IntakeDocument[]
  items: {
    title: string
    status: string
    is_required: boolean
    updated_at?: string
  }[]
}) {
  const blockers: string[] = []
  if (!input.clientName?.trim()) blockers.push("Add the client’s name.")
  if (!input.conflictReviewed)
    blockers.push("An attorney must record the conflict decision.")
  const intake = input.documents.find(
    (document) => document.name === "Intake questionnaire"
  )
  const letter = input.documents.find(
    (document) => document.name === "Engagement letter"
  )
  if (intake?.status !== "received" || intake.draftStatus !== "final")
    blockers.push("Complete and approve the intake questionnaire.")
  if (
    letter?.status !== "signed" ||
    letter.signatureStatus !== "signed" ||
    !letter.signatureCurrent ||
    letter.draftStatus !== "final"
  )
    blockers.push(
      "Obtain the client’s signature on the approved engagement letter."
    )
  for (const title of [INTAKE_REVIEW, ENGAGEMENT_REVIEW]) {
    const document = title === INTAKE_REVIEW ? intake : letter
    if (
      !input.items.some(
        (item) =>
          item.title === title &&
          item.status === "completed" &&
          (!document?.updatedAt ||
            (!!item.updated_at && item.updated_at >= document.updatedAt))
      )
    )
      blockers.push(title + ".")
  }
  const open = input.items.filter(
    (item) =>
      item.is_required &&
      item.status === "open" &&
      ![INTAKE_REVIEW, ENGAGEMENT_REVIEW].includes(item.title)
  )
  if (open.length)
    blockers.push(
      `Complete ${open.length} required setup item${open.length === 1 ? "" : "s"}.`
    )
  return blockers
}
