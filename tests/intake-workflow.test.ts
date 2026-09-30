import assert from "node:assert/strict"
import { test } from "node:test"
import {
  ENGAGEMENT_REVIEW,
  INTAKE_REVIEW,
  intakeBlockers,
  intakeDocumentStage,
} from "../lib/matters/intake-workflow"

const ready = {
  clientName: "Fictional Client",
  conflictReviewed: true,
  documents: [
    {
      id: "intake",
      name: "Intake questionnaire",
      status: "received",
      draftId: "draft-intake",
      draftStatus: "final",
      signatureStatus: null,
    },
    {
      id: "letter",
      name: "Engagement letter",
      status: "signed",
      draftId: "draft-letter",
      draftStatus: "final",
      signatureStatus: "signed",
      signatureCurrent: true,
    },
  ],
  items: [INTAKE_REVIEW, ENGAGEMENT_REVIEW].map((title) => ({
    title,
    status: "completed",
    is_required: true,
  })),
}

test("ready intake has no blockers", () =>
  assert.deepEqual(intakeBlockers(ready), []))
test("a signed label without a current signature still blocks activation", () => {
  assert.ok(
    intakeBlockers({
      ...ready,
      documents: ready.documents.map((item) => ({
        ...item,
        signatureCurrent: false,
      })),
    }).some((item) => item.includes("signature"))
  )
})
test("automated conflict search is insufficient without attorney review", () => {
  assert.ok(
    intakeBlockers({ ...ready, conflictReviewed: false }).some((item) =>
      item.includes("conflict")
    )
  )
})
test("waived review tasks cannot substitute for reviewed documents", () => {
  assert.equal(
    intakeBlockers({
      ...ready,
      items: ready.items.map((item) => ({ ...item, status: "waived" })),
    }).length,
    2
  )
})
test("required setup items block activation but optional follow-ups do not", () => {
  const task = { title: "Request records", status: "open", is_required: true }
  assert.equal(
    intakeBlockers({ ...ready, items: [...ready.items, task] }).length,
    1
  )
  assert.deepEqual(
    intakeBlockers({
      ...ready,
      items: [...ready.items, { ...task, is_required: false }],
    }),
    []
  )
})
test("queued mail is not reported as sent", () => {
  const document = {
    ...ready.documents[0],
    status: "requested",
    deliveryStatus: "queued",
  }
  assert.equal(intakeDocumentStage(document), "Email queued")
  assert.equal(
    intakeDocumentStage({ ...document, deliveryStatus: "sent" }),
    "Sent to client"
  )
})
