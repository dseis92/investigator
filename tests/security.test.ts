/**
 * Phase 1 security acceptance tests: matter isolation.
 *
 * Run with: npm test
 *
 * These tests exercise the LIVE linked Supabase project (there is no local
 * Docker/Postgres instance available in this environment — see the Phase 1
 * acceptance report for that limitation) using two real, unprivileged,
 * authenticated user sessions — never the service-role key — so every
 * assertion here reflects exactly what RLS, grants, and triggers actually
 * allow a real client to do, not what application code merely chooses not
 * to expose.
 *
 * Test data is entirely fictional and lives under its own matter_number
 * prefix (SECTEST-*) and its own user emails (sectest.*@traceline.local),
 * fully isolated from the demo seed data. All of it is deleted in the
 * top-level `after` hook.
 */
import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { config } from "dotenv"
import { resolve } from "node:path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../lib/supabase/types"

config({ path: resolve(process.cwd(), ".env.local") })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY")
}

const RUN_ID = Date.now()
const PASSWORD = "SecTest-Phase1-2026!"
const EMAIL_A = `sectest.usera.${RUN_ID}@traceline.local`
const EMAIL_B = `sectest.userb.${RUN_ID}@traceline.local`

const admin = createClient<Database>(URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

type Client = SupabaseClient<Database>

let clientA: Client
let clientB: Client
let anonClient: Client
let userAId: string
let userBId: string

type EntitySet = {
  matterId: string
  matterNumber: string
  questionId: string
  propositionId: string
  subjectId: string
  entityAttributeId: string
  leadId: string
  sourceId: string
  evidenceId: string
  eventId: string
  statementId: string
  evidenceAnnotationId: string
  evidenceLinkId: string
  contradictionId: string
  contradictionEvidenceId: string
  analysisId: string
  analysisConclusionId: string
  analysisConclusionEvidenceId: string
  reportId: string
  reviewDecisionId: string
  auditEventId: string
  appointmentId: string
  appointmentDocumentId: string
  appointmentDocumentDraftId: string
  deadlineId: string
  contactId: string
}

let matterA: EntitySet
let matterB: EntitySet

async function newUserClient(email: string): Promise<{ client: Client; userId: string }> {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (createError || !created.user) throw createError ?? new Error(`Failed to create ${email}`)

  const client = createClient<Database>(URL, ANON_KEY)
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (signInError) throw signInError

  return { client, userId: created.user.id }
}

/** Creates one row of every matter-owned entity type, as the given client/user, under a fresh matter it creates itself via create_matter(). */
async function seedFullEntitySet(client: Client, userId: string, label: string): Promise<EntitySet> {
  const matterNumber = `SECTEST-${label}-${RUN_ID}`
  const createdBy = { created_by: userId }

  const { data: matter, error: matterError } = await client.rpc("create_matter", {
    p_matter_number: matterNumber,
    p_name: `Security Test Matter ${label}`,
    p_case_mode: "criminal_defense",
  })
  if (matterError || !matter) throw matterError ?? new Error("create_matter returned no row")
  const matterId = matter.id

  const { data: question, error: qErr } = await client
    .from("questions")
    .insert({ matter_id: matterId, prompt: `Test question ${label}`, ...createdBy })
    .select("id")
    .single()
  if (qErr || !question) throw qErr

  const { data: proposition, error: pErr } = await client
    .from("propositions")
    .insert({ matter_id: matterId, question_id: question.id, statement: `Test proposition ${label}`, ...createdBy })
    .select("id")
    .single()
  if (pErr || !proposition) throw pErr

  const { data: subject, error: sErr } = await client
    .from("subjects")
    .insert({ matter_id: matterId, subject_type: "person", display_name: `Test subject ${label}`, ...createdBy })
    .select("id")
    .single()
  if (sErr || !subject) throw sErr

  const { data: source, error: srcErr } = await client
    .from("sources")
    .insert({ matter_id: matterId, source_type: "other", name: `Test source ${label}`, ...createdBy })
    .select("id")
    .single()
  if (srcErr || !source) throw srcErr

  const { data: evidence, error: eErr } = await client
    .from("evidence")
    .insert({
      matter_id: matterId,
      evidence_number: `EV-${label}-1`,
      title: `Test evidence ${label}`,
      artifact_type: "document",
      source_id: source.id,
      ...createdBy,
    })
    .select("id")
    .single()
  if (eErr || !evidence) throw eErr

  const { data: evidenceAnnotation, error: eanErr } = await client
    .from("evidence_annotations")
    .insert({ matter_id: matterId, evidence_id: evidence.id, body: `Test annotation ${label}`, author_id: userId })
    .select("id")
    .single()
  if (eanErr || !evidenceAnnotation) throw eanErr

  const { data: entityAttribute, error: eaErr } = await client
    .from("entity_attributes")
    .insert({
      matter_id: matterId,
      subject_id: subject.id,
      attribute_key: "Test attribute",
      attribute_value: "Test value",
      evidence_id: evidence.id,
      ...createdBy,
    })
    .select("id")
    .single()
  if (eaErr || !entityAttribute) throw eaErr

  const { data: lead, error: lErr } = await client
    .from("leads")
    .insert({
      matter_id: matterId,
      subject_id: subject.id,
      question_id: question.id,
      description: `Test lead ${label}`,
      ...createdBy,
    })
    .select("id")
    .single()
  if (lErr || !lead) throw lErr

  const { data: event, error: evErr } = await client
    .from("events")
    .insert({
      matter_id: matterId,
      title: `Test event ${label}`,
      event_start: new Date().toISOString(),
      primary_evidence_id: evidence.id,
      ...createdBy,
    })
    .select("id")
    .single()
  if (evErr || !event) throw evErr

  const { data: statement, error: stErr } = await client
    .from("statements")
    .insert({
      matter_id: matterId,
      subject_id: subject.id,
      evidence_id: evidence.id,
      content: `Test statement ${label}`,
      ...createdBy,
    })
    .select("id")
    .single()
  if (stErr || !statement) throw stErr

  const { data: evidenceLink, error: elErr } = await client
    .from("evidence_links")
    .insert({
      matter_id: matterId,
      evidence_id: evidence.id,
      proposition_id: proposition.id,
      relationship: "supports",
      ...createdBy,
    })
    .select("id")
    .single()
  if (elErr || !evidenceLink) throw elErr

  const { data: contradiction, error: cErr } = await client
    .from("contradictions")
    .insert({
      matter_id: matterId,
      title: `Test contradiction ${label}`,
      conflict_type: "factual",
      side_a_label: "A",
      side_a_summary: "Side A summary",
      side_b_label: "B",
      side_b_summary: "Side B summary",
      statement_a_id: statement.id,
      proposition_a_id: proposition.id,
      ...createdBy,
    })
    .select("id")
    .single()
  if (cErr || !contradiction) throw cErr

  const { data: contradictionEvidence, error: ceErr } = await client
    .from("contradiction_evidence")
    .insert({ matter_id: matterId, contradiction_id: contradiction.id, side: "a", evidence_id: evidence.id, ...createdBy })
    .select("id")
    .single()
  if (ceErr || !contradictionEvidence) throw ceErr

  const { error: crErr } = await client
    .from("contradiction_reviews")
    .insert({ matter_id: matterId, contradiction_id: contradiction.id, weakest_assumption: "Test" })
  if (crErr) throw crErr

  const { data: analysis, error: aErr } = await client
    .from("analyses")
    .insert({
      matter_id: matterId,
      proposition_id: proposition.id,
      question_id: question.id,
      title: `Test analysis ${label}`,
      summary: "Test summary",
      authored_by: userId,
    })
    .select("id")
    .single()
  if (aErr || !analysis) throw aErr

  const { data: conclusion, error: acErr } = await client
    .from("analysis_conclusions")
    .insert({
      matter_id: matterId,
      analysis_id: analysis.id,
      conclusion_text: "Test conclusion",
      classification: "unknown",
      ...createdBy,
    })
    .select("id")
    .single()
  if (acErr || !conclusion) throw acErr

  const { data: conclusionEvidence, error: aceErr } = await client
    .from("analysis_conclusion_evidence")
    .insert({ matter_id: matterId, conclusion_id: conclusion.id, evidence_id: evidence.id })
    .select("id")
    .single()
  if (aceErr || !conclusionEvidence) throw aceErr

  const { data: report, error: rErr } = await client
    .from("reports")
    .insert({ matter_id: matterId, report_type: "proposition_evidence_matrix", title: "Test report", generated_by: userId })
    .select("id")
    .single()
  if (rErr || !report) throw rErr

  const { data: reviewDecision, error: rdErr } = await client.rpc("log_review_decision", {
    p_matter_id: matterId,
    p_entity_type: "evidence",
    p_entity_id: evidence.id,
    p_decision: "approved",
  })
  if (rdErr || !reviewDecision) throw rdErr

  const { data: auditEvent, error: aeErr } = await client.rpc("log_audit_event", {
    p_matter_id: matterId,
    p_entity_type: "evidence",
    p_entity_id: evidence.id,
    p_action: "create",
    p_summary: "Test audit event",
  })
  if (aeErr || !auditEvent) throw aeErr

  const startsAt = new Date(Date.now() + 60 * 60 * 1000)
  const { data: appointment, error: appointmentError } = await client
    .from("appointments")
    .insert({
      matter_id: matterId,
      workflow_key: "custom",
      title: `Test appointment ${label}`,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
      created_by: userId,
    })
    .select("id")
    .single()
  if (appointmentError || !appointment) throw appointmentError

  const { data: appointmentDocument, error: appointmentDocumentError } = await client
    .from("appointment_documents")
    .insert({
      matter_id: matterId,
      appointment_id: appointment.id,
      name: "Intake questionnaire",
      created_by: userId,
    })
    .select("id")
    .single()
  if (appointmentDocumentError || !appointmentDocument) throw appointmentDocumentError

  const { data: appointmentDocumentDraft, error: appointmentDocumentDraftError } = await client
    .from("appointment_document_drafts")
    .insert({
      matter_id: matterId,
      appointment_document_id: appointmentDocument.id,
      template_key: "intake_questionnaire",
      content: `Security test draft ${label}`,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single()
  if (appointmentDocumentDraftError || !appointmentDocumentDraft) throw appointmentDocumentDraftError

  const { data: deadline, error: deadlineError } = await client
    .from("matter_deadlines")
    .insert({
      matter_id: matterId,
      title: `Test filing deadline ${label}`,
      kind: "filing",
      due_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      priority: "high",
      notes: `Security test deadline ${label}`,
      created_by: userId,
    })
    .select("id")
    .single()
  if (deadlineError || !deadline) throw deadlineError

  const { data: contact, error: contactError } = await client
    .from("matter_contacts")
    .insert({
      matter_id: matterId,
      display_name: `Test Contact ${label}`,
      contact_type: "client",
      email: `contact.${label.toLowerCase()}@example.com`,
      created_by: userId,
    })
    .select("id")
    .single()
  if (contactError || !contact) throw contactError

  return {
    matterId,
    matterNumber,
    questionId: question.id,
    propositionId: proposition.id,
    subjectId: subject.id,
    entityAttributeId: entityAttribute.id,
    leadId: lead.id,
    sourceId: source.id,
    evidenceId: evidence.id,
    eventId: event.id,
    statementId: statement.id,
    evidenceAnnotationId: evidenceAnnotation.id,
    evidenceLinkId: evidenceLink.id,
    contradictionId: contradiction.id,
    contradictionEvidenceId: contradictionEvidence.id,
    analysisId: analysis.id,
    analysisConclusionId: conclusion.id,
    analysisConclusionEvidenceId: conclusionEvidence.id,
    reportId: report.id,
    reviewDecisionId: reviewDecision.id,
    auditEventId: auditEvent.id,
    appointmentId: appointment.id,
    appointmentDocumentId: appointmentDocument.id,
    appointmentDocumentDraftId: appointmentDocumentDraft.id,
    deadlineId: deadline.id,
    contactId: contact.id,
  }
}

before(async () => {
  const a = await newUserClient(EMAIL_A)
  const b = await newUserClient(EMAIL_B)
  clientA = a.client
  userAId = a.userId
  clientB = b.client
  userBId = b.userId
  anonClient = createClient<Database>(URL, ANON_KEY)

  matterA = await seedFullEntitySet(clientA, userAId, "A")
  matterB = await seedFullEntitySet(clientB, userBId, "B")
})

after(async () => {
  // Deleting the matters cascades to every child row via ON DELETE CASCADE
  // on matter_id across all matter-owned tables.
  await admin.from("matters").delete().eq("id", matterA.matterId)
  await admin.from("matters").delete().eq("id", matterB.matterId)
  await admin.auth.admin.deleteUser(userAId)
  await admin.auth.admin.deleteUser(userBId)
})

// ============================================================
// Matter isolation
// ============================================================

describe("matter isolation", () => {
  test("User A can read Matter A", async () => {
    const { data } = await clientA.from("matters").select("id").eq("id", matterA.matterId).maybeSingle()
    assert.ok(data, "User A should see their own matter")
  })

  test("User A cannot read Matter B", async () => {
    const { data } = await clientA.from("matters").select("id").eq("id", matterB.matterId).maybeSingle()
    assert.equal(data, null, "User A must not see Matter B")
  })

  test("User B can read Matter B", async () => {
    const { data } = await clientB.from("matters").select("id").eq("id", matterB.matterId).maybeSingle()
    assert.ok(data, "User B should see their own matter")
  })

  test("User B cannot read Matter A", async () => {
    const { data } = await clientB.from("matters").select("id").eq("id", matterA.matterId).maybeSingle()
    assert.equal(data, null, "User B must not see Matter A")
  })
})

// ============================================================
// Direct reads: User A attempting to read every Matter B table
// ============================================================

describe("direct reads across every matter-owned table", () => {
  const tables: { table: keyof Database["public"]["Tables"]; matterIdColumn?: string }[] = [
    { table: "matter_members" },
    { table: "questions" },
    { table: "propositions" },
    { table: "subjects" },
    { table: "entity_attributes" },
    { table: "leads" },
    { table: "sources" },
    { table: "evidence" },
    { table: "evidence_annotations" },
    { table: "events" },
    { table: "statements" },
    { table: "evidence_links" },
    { table: "contradictions" },
    { table: "contradiction_evidence" },
    { table: "contradiction_reviews" },
    { table: "analyses" },
    { table: "analysis_conclusions" },
    { table: "analysis_conclusion_evidence" },
    { table: "reports" },
    { table: "review_decisions" },
    { table: "audit_events" },
    { table: "appointment_document_drafts" },
    { table: "appointment_packet_reminders" },
    { table: "appointment_communications" },
    { table: "matter_deadlines" },
    { table: "matter_contacts" },
  ]

  for (const { table } of tables) {
    test(`User A cannot read Matter B rows in ${table}`, async () => {
      // `table` is a union of 21 table names here, which collapses eq()'s
      // column overload to the intersection of their column types rather
      // than the real per-table columns — every one of these tables does
      // have matter_id (see the migrations), so this is a TS inference
      // limitation of the dynamic loop, not a real type issue.
      const { data } = await clientA.from(table).select("*").eq("matter_id" as never, matterB.matterId)
      assert.equal(data?.length ?? 0, 0, `${table}: expected zero visible rows for Matter B`)
    })
  }
})

// ============================================================
// Direct writes: User A attempting to create/update Matter B rows by
// manually supplying Matter B's matter_id
// ============================================================

describe("direct writes into Matter B, supplying Matter B's own matter_id", () => {
  test("cannot insert a question into Matter B", async () => {
    const { error } = await clientA
      .from("questions")
      .insert({ matter_id: matterB.matterId, prompt: "forged", created_by: userAId })
    assert.ok(error, "insert should be rejected")
  })

  test("cannot insert a subject into Matter B", async () => {
    const { error } = await clientA
      .from("subjects")
      .insert({ matter_id: matterB.matterId, subject_type: "person", display_name: "forged", created_by: userAId })
    assert.ok(error)
  })

  test("cannot insert a source into Matter B", async () => {
    const { error } = await clientA
      .from("sources")
      .insert({ matter_id: matterB.matterId, source_type: "other", name: "forged", created_by: userAId })
    assert.ok(error)
  })

  test("cannot insert evidence into Matter B", async () => {
    const { error } = await clientA.from("evidence").insert({
      matter_id: matterB.matterId,
      evidence_number: "FORGED-1",
      title: "forged",
      artifact_type: "document",
      created_by: userAId,
    })
    assert.ok(error)
  })

  test("cannot insert an event into Matter B", async () => {
    const { error } = await clientA
      .from("events")
      .insert({ matter_id: matterB.matterId, title: "forged", event_start: new Date().toISOString(), created_by: userAId })
    assert.ok(error)
  })

  test("cannot insert an evidence_link into Matter B (using Matter B's own real evidence/proposition ids)", async () => {
    const { error } = await clientA.from("evidence_links").insert({
      matter_id: matterB.matterId,
      evidence_id: matterB.evidenceId,
      proposition_id: matterB.propositionId,
      relationship: "supports",
      created_by: userAId,
    })
    assert.ok(error)
  })

  test("cannot insert a contradiction into Matter B", async () => {
    const { error } = await clientA.from("contradictions").insert({
      matter_id: matterB.matterId,
      title: "forged",
      conflict_type: "factual",
      side_a_label: "A",
      side_a_summary: "x",
      side_b_label: "B",
      side_b_summary: "y",
      created_by: userAId,
    })
    assert.ok(error)
  })

  test("cannot insert an analysis into Matter B", async () => {
    const { error } = await clientA
      .from("analyses")
      .insert({ matter_id: matterB.matterId, title: "forged", summary: "x", authored_by: userAId })
    assert.ok(error)
  })

  test("cannot insert a report into Matter B", async () => {
    const { error } = await clientA
      .from("reports")
      .insert({ matter_id: matterB.matterId, report_type: "proposition_evidence_matrix", title: "forged", generated_by: userAId })
    assert.ok(error)
  })

  test("cannot insert a matter_members row adding self to Matter B", async () => {
    const { error } = await clientA
      .from("matter_members")
      .insert({ matter_id: matterB.matterId, user_id: userAId, role: "attorney" })
    assert.ok(error, "must not be able to self-admit to Matter B")
  })

  test("cannot update a Matter B question", async () => {
    const { data } = await clientA
      .from("questions")
      .update({ prompt: "tampered" })
      .eq("id", matterB.questionId)
      .select()
    assert.equal(data?.length ?? 0, 0, "update should affect zero rows")
  })

  test("cannot update Matter B's evidence review state", async () => {
    const { data } = await clientA
      .from("evidence")
      .update({ review_state: "reviewed" })
      .eq("id", matterB.evidenceId)
      .select()
    assert.equal(data?.length ?? 0, 0)
  })

  test("cannot update Matter B's own matter row", async () => {
    const { data } = await clientA.from("matters").update({ name: "tampered" }).eq("id", matterB.matterId).select()
    assert.equal(data?.length ?? 0, 0)
  })

  test("cannot insert an appointment document draft into Matter B", async () => {
    const { error } = await clientA.from("appointment_document_drafts").insert({
      matter_id: matterB.matterId,
      appointment_document_id: matterB.appointmentDocumentId,
      template_key: "intake_questionnaire",
      content: "forged",
      created_by: userAId,
      updated_by: userAId,
    })
    assert.ok(error)
  })

  test("cannot insert appointment communication into Matter B", async () => {
    const { error } = await clientA.from("appointment_communications").insert({
      matter_id: matterB.matterId,
      appointment_id: matterB.appointmentId,
      channel: "email",
      recipient: "client@example.com",
      subject: "forged",
      body: "forged",
      created_by: userAId,
    })
    assert.ok(error)
  })

  test("cannot insert a legal deadline into Matter B", async () => {
    const { error } = await clientA.from("matter_deadlines").insert({
      matter_id: matterB.matterId,
      title: "forged deadline",
      kind: "filing",
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_by: userAId,
    })
    assert.ok(error)
  })

  test("cannot insert a contact into Matter B", async () => {
    const { error } = await clientA.from("matter_contacts").insert({
      matter_id: matterB.matterId,
      display_name: "forged contact",
      contact_type: "client",
      created_by: userAId,
    })
    assert.ok(error)
  })
})

describe("client preparation packet", () => {
  test("public packet is viewable once, submits intake, and closes", async () => {
    const { error: intakeDraftError } = await clientA
      .from("appointment_document_drafts")
      .update({ status: "final" })
      .eq("appointment_document_id", matterA.appointmentDocumentId)
    assert.equal(intakeDraftError, null)

    const { data: engagementDocument, error: engagementDocumentError } = await clientA
      .from("appointment_documents")
      .insert({
        matter_id: matterA.matterId,
        appointment_id: matterA.appointmentId,
        name: "Engagement letter",
        created_by: userAId,
      })
      .select("id")
      .single()
    if (engagementDocumentError || !engagementDocument) throw engagementDocumentError

    const { error: engagementDraftError } = await clientA.from("appointment_document_drafts").insert({
      matter_id: matterA.matterId,
      appointment_document_id: engagementDocument.id,
      template_key: "engagement_letter",
      content: "Approved engagement letter for security test",
      status: "final",
      created_by: userAId,
      updated_by: userAId,
    })
    assert.equal(engagementDraftError, null)

    const packetToken = `packet-${RUN_ID}-${"x".repeat(55)}`
    const { data: packet, error: packetError } = await clientA.from("appointment_packets").insert({
      matter_id: matterA.matterId,
      appointment_id: matterA.appointmentId,
      token: packetToken,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      created_by: userAId,
    }).select("id").single()
    assert.equal(packetError, null)
    assert.ok(packet)

    const { error: reminderError } = await clientA.from("appointment_packet_reminders").insert({
      matter_id: matterA.matterId,
      packet_id: packet.id,
      kind: "first_reminder",
      send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    assert.equal(reminderError, null)

    const { data: packetView, error: viewError } = await anonClient.rpc("get_appointment_packet", { p_token: packetToken })
    assert.equal(viewError, null)
    assert.ok(packetView)
    assert.equal((packetView as { documents: unknown[] }).documents.length, 2)

    const { data: submission, error: submissionError } = await anonClient.rpc("submit_appointment_packet", {
      p_token: packetToken,
      p_full_name: "Packet Client",
      p_email: `packet.client.${RUN_ID}@example.com`,
      p_phone: "555-0100",
      p_summary: "A factual summary",
      p_goals: "Resolve the matter",
      p_deadlines: "No known deadline",
      p_engagement_acknowledged: true,
    })
    assert.equal(submissionError, null)
    assert.equal((submission as { ok: boolean }).ok, true)

    const { data: closedView, error: closedViewError } = await anonClient.rpc("get_appointment_packet", { p_token: packetToken })
    assert.equal(closedViewError, null)
    assert.equal(closedView, null, "a completed packet must not be viewable again")

    const { data: intake } = await clientA.from("appointment_intake").select("full_name, client_completed_at").eq("appointment_id", matterA.appointmentId).single()
    assert.equal(intake?.full_name, "Packet Client")
    assert.ok(intake?.client_completed_at)

    const { data: reminder } = await clientA.from("appointment_packet_reminders").select("status").eq("packet_id", packet.id).single()
    assert.equal(reminder?.status, "cancelled", "completing a packet must cancel planned reminders")

    const { data: communication, error: communicationError } = await clientA.from("appointment_communications").insert({
      matter_id: matterA.matterId,
      appointment_id: matterA.appointmentId,
      channel: "email",
      status: "queued",
      recipient: "packet.client@example.com",
      subject: "Packet follow-up",
      body: "Your preparation packet is ready.",
      created_by: userAId,
    }).select("status").single()
    assert.equal(communicationError, null)
    assert.equal(communication?.status, "queued")
  })
})

describe("matter deadlines", () => {
  test("Matter A can complete and reopen its own deadline", async () => {
    const { data: completed, error: completeError } = await clientA
      .from("matter_deadlines")
      .update({ status: "done" })
      .eq("id", matterA.deadlineId)
      .eq("matter_id", matterA.matterId)
      .select("status")
      .single()
    assert.equal(completeError, null)
    assert.equal(completed?.status, "done")

    const { data: reopened, error: reopenError } = await clientA
      .from("matter_deadlines")
      .update({ status: "open" })
      .eq("id", matterA.deadlineId)
      .eq("matter_id", matterA.matterId)
      .select("status")
      .single()
    assert.equal(reopenError, null)
    assert.equal(reopened?.status, "open")
  })
})

describe("matter contacts", () => {
  test("Matter A can archive and reactivate its own contact", async () => {
    const { data: archived, error: archiveError } = await clientA
      .from("matter_contacts")
      .update({ status: "archived" })
      .eq("id", matterA.contactId)
      .eq("matter_id", matterA.matterId)
      .select("status")
      .single()
    assert.equal(archiveError, null)
    assert.equal(archived?.status, "archived")

    const { data: active, error: reactivateError } = await clientA
      .from("matter_contacts")
      .update({ status: "active" })
      .eq("id", matterA.contactId)
      .eq("matter_id", matterA.matterId)
      .select("status")
      .single()
    assert.equal(reactivateError, null)
    assert.equal(active?.status, "active")
  })
})

// ============================================================
// Cross-matter reference attacks: User A creating/updating a Matter A row
// that references a real Matter B row
// ============================================================

describe("cross-matter reference attacks (own matter, foreign target)", () => {
  test("Matter A evidence cannot reference Matter B's source", async () => {
    const { error } = await clientA.from("evidence").insert({
      matter_id: matterA.matterId,
      evidence_number: `EV-CROSS-${RUN_ID}`,
      title: "cross-matter source attempt",
      artifact_type: "document",
      source_id: matterB.sourceId,
      created_by: userAId,
    })
    assert.ok(error, "composite FK should reject a Matter B source_id under a Matter A row")
  })

  test("Matter A proposition cannot reference Matter B's question", async () => {
    const { error } = await clientA
      .from("propositions")
      .insert({ matter_id: matterA.matterId, question_id: matterB.questionId, statement: "cross-matter", created_by: userAId })
    assert.ok(error)
  })

  test("Matter A entity_attribute cannot reference Matter B's subject", async () => {
    const { error } = await clientA.from("entity_attributes").insert({
      matter_id: matterA.matterId,
      subject_id: matterB.subjectId,
      attribute_key: "k",
      attribute_value: "v",
      created_by: userAId,
    })
    assert.ok(error)
  })

  test("Matter A entity_attribute cannot reference Matter B's evidence", async () => {
    const { error } = await clientA.from("entity_attributes").insert({
      matter_id: matterA.matterId,
      subject_id: matterA.subjectId,
      attribute_key: "k",
      attribute_value: "v",
      evidence_id: matterB.evidenceId,
      created_by: userAId,
    })
    assert.ok(error, "attribute → Matter B evidence must be rejected")
  })

  test("Matter A event cannot reference Matter B's evidence as primary_evidence_id", async () => {
    const { error } = await clientA.from("events").insert({
      matter_id: matterA.matterId,
      title: "cross-matter event",
      event_start: new Date().toISOString(),
      primary_evidence_id: matterB.evidenceId,
      created_by: userAId,
    })
    assert.ok(error)
  })

  test("Matter A statement cannot reference Matter B's evidence", async () => {
    const { error } = await clientA.from("statements").insert({
      matter_id: matterA.matterId,
      evidence_id: matterB.evidenceId,
      content: "cross-matter statement",
      created_by: userAId,
    })
    assert.ok(error)
  })

  test("Matter A evidence_link cannot reference Matter B's subject", async () => {
    const { error } = await clientA.from("evidence_links").insert({
      matter_id: matterA.matterId,
      evidence_id: matterA.evidenceId,
      subject_id: matterB.subjectId,
      relationship: "mentions",
      created_by: userAId,
    })
    assert.ok(error, "Matter A evidence → Matter B subject must be rejected")
  })

  test("Matter A evidence_link cannot reference Matter B's proposition", async () => {
    const { error } = await clientA.from("evidence_links").insert({
      matter_id: matterA.matterId,
      evidence_id: matterA.evidenceId,
      proposition_id: matterB.propositionId,
      relationship: "supports",
      created_by: userAId,
    })
    assert.ok(error, "Matter A evidence → Matter B proposition must be rejected")
  })

  test("Matter A evidence cannot be marked superseded by Matter B's evidence", async () => {
    const { error } = await clientA.from("evidence").update({ superseded_by: matterB.evidenceId }).eq("id", matterA.evidenceId)
    assert.ok(error, "cross-matter supersession must be rejected")
  })

  test("Matter A contradiction cannot reference Matter B's statement/proposition", async () => {
    const { error } = await clientA.from("contradictions").insert({
      matter_id: matterA.matterId,
      title: "cross-matter contradiction",
      conflict_type: "factual",
      side_a_label: "A",
      side_a_summary: "x",
      side_b_label: "B",
      side_b_summary: "y",
      statement_a_id: matterB.statementId,
      proposition_a_id: matterB.propositionId,
      created_by: userAId,
    })
    assert.ok(error)
  })

  test("Matter A contradiction_evidence cannot cite Matter B's evidence", async () => {
    const { error } = await clientA.from("contradiction_evidence").insert({
      matter_id: matterA.matterId,
      contradiction_id: matterA.contradictionId,
      side: "b",
      evidence_id: matterB.evidenceId,
      created_by: userAId,
    })
    assert.ok(error, "Matter A contradiction → Matter B evidence must be rejected")
  })

  test("Matter A analysis cannot reference Matter B's proposition/question", async () => {
    const { error } = await clientA.from("analyses").insert({
      matter_id: matterA.matterId,
      proposition_id: matterB.propositionId,
      question_id: matterB.questionId,
      title: "cross-matter analysis",
      summary: "x",
      authored_by: userAId,
    })
    assert.ok(error)
  })

  test("Matter A analysis_conclusion_evidence cannot cite Matter B's evidence", async () => {
    const { error } = await clientA.from("analysis_conclusion_evidence").insert({
      matter_id: matterA.matterId,
      conclusion_id: matterA.analysisConclusionId,
      evidence_id: matterB.evidenceId,
    })
    assert.ok(error, "Matter A analysis conclusion → Matter B evidence must be rejected")
  })

  test("Matter A leads cannot reference Matter B's subject/question", async () => {
    const { error } = await clientA.from("leads").insert({
      matter_id: matterA.matterId,
      subject_id: matterB.subjectId,
      question_id: matterB.questionId,
      description: "x",
      created_by: userAId,
    })
    assert.ok(error)
  })
})

// ============================================================
// Audit spoofing
// ============================================================

describe("audit spoofing", () => {
  test("cannot insert into audit_events directly at all (grant revoked)", async () => {
    const { error } = await clientA.from("audit_events").insert({
      matter_id: matterA.matterId,
      actor_id: userBId,
      entity_type: "evidence",
      entity_id: matterA.evidenceId,
      action: "create",
      summary: "forged",
    })
    assert.ok(error, "direct INSERT on audit_events must be rejected at the grant level")
  })

  test("log_audit_event() ignores/cannot be made to forge actor_id: recorded row always has the caller's own auth.uid()", async () => {
    const { data, error } = await clientA.rpc("log_audit_event", {
      p_matter_id: matterA.matterId,
      p_entity_type: "evidence",
      p_entity_id: matterA.evidenceId,
      p_action: "update",
      p_summary: "legitimate call",
    })
    assert.equal(error, null)
    assert.equal(data?.actor_id, userAId, "actor_id must be the caller, never spoofable")
  })

  test("log_audit_event() rejects a matter the caller is not a member of", async () => {
    const { error } = await clientA.rpc("log_audit_event", {
      p_matter_id: matterB.matterId,
      p_entity_type: "evidence",
      p_entity_id: matterB.evidenceId,
      p_action: "create",
      p_summary: "forged cross-matter audit event",
    })
    assert.ok(error, "must reject: caller is not a member of Matter B")
  })

  test("log_audit_event() rejects a mismatched entity/matter pair (Matter A matter_id, Matter B entity_id)", async () => {
    const { error } = await clientA.rpc("log_audit_event", {
      p_matter_id: matterA.matterId,
      p_entity_type: "evidence",
      p_entity_id: matterB.evidenceId,
      p_action: "create",
      p_summary: "forged mismatched audit event",
    })
    assert.ok(error, "must reject: entity_id belongs to a different matter than matter_id")
  })

  test("log_audit_event() rejects a nonexistent entity_id", async () => {
    const { error } = await clientA.rpc("log_audit_event", {
      p_matter_id: matterA.matterId,
      p_entity_type: "evidence",
      p_entity_id: "00000000-0000-0000-0000-000000000000",
      p_action: "create",
      p_summary: "forged nonexistent entity",
    })
    assert.ok(error)
  })

  test("cannot update or delete an existing audit_events row", async () => {
    const updateResult = await clientA
      .from("audit_events")
      .update({ summary: "tampered" })
      .eq("id", matterA.auditEventId)
    assert.ok(updateResult.error, "UPDATE on audit_events must be rejected")

    const deleteResult = await clientA.from("audit_events").delete().eq("id", matterA.auditEventId)
    assert.ok(deleteResult.error, "DELETE on audit_events must be rejected")
  })

  test("cannot insert into review_decisions directly (reviewer_id spoofing) — grant revoked", async () => {
    const { error } = await clientA.from("review_decisions").insert({
      matter_id: matterA.matterId,
      entity_type: "evidence",
      entity_id: matterA.evidenceId,
      decision: "approved",
      reviewer_id: userBId,
    })
    assert.ok(error, "direct INSERT on review_decisions must be rejected at the grant level")
  })

  test("log_review_decision() records the caller's own reviewer_id, never spoofable", async () => {
    const { data, error } = await clientA.rpc("log_review_decision", {
      p_matter_id: matterA.matterId,
      p_entity_type: "evidence",
      p_entity_id: matterA.evidenceId,
      p_decision: "flagged",
    })
    assert.equal(error, null)
    assert.equal(data?.reviewer_id, userAId)
  })
})

// ============================================================
// Function and role attacks
// ============================================================

describe("function and role attacks", () => {
  test("anonymous client cannot call create_matter", async () => {
    const { error } = await anonClient.rpc("create_matter", {
      p_matter_number: `ANON-${RUN_ID}`,
      p_name: "anon matter",
      p_case_mode: "criminal_defense",
    })
    assert.ok(error, "anon must not be able to create a matter")
  })

  test("anonymous client cannot call is_matter_member", async () => {
    const { error } = await anonClient.rpc("is_matter_member", { p_matter_id: matterA.matterId })
    assert.ok(error, "anon must not have EXECUTE on is_matter_member")
  })

  test("anonymous client cannot call log_audit_event", async () => {
    const { error } = await anonClient.rpc("log_audit_event", {
      p_matter_id: matterA.matterId,
      p_entity_type: "evidence",
      p_entity_id: matterA.evidenceId,
      p_action: "create",
      p_summary: "anon forged",
    })
    assert.ok(error)
  })

  test("create_matter no longer accepts a client-supplied role: creator is always 'attorney'", async () => {
    // Deliberately untyped payload: this simulates a raw client (curl,
    // Postman, a hand-modified fetch) attempting to smuggle p_role through
    // the RPC call the way the pre-fix 6-argument create_matter() accepted
    // it. The database, not the generated TypeScript types, is the real
    // boundary here — the old overload no longer exists at all.
    const forgedPayload = {
      p_matter_number: `SECTEST-ROLE-${RUN_ID}`,
      p_name: "role escalation attempt",
      p_case_mode: "criminal_defense",
      p_role: "admin",
    }
    const { data, error } = await clientA.rpc("create_matter", forgedPayload as never)

    assert.ok(error, "server must reject the removed p_role parameter rather than silently accepting it")
    if (!error && data) {
      const { data: member } = await clientA
        .from("matter_members")
        .select("role")
        .eq("matter_id", (data as { id: string }).id)
        .eq("user_id", userAId)
        .single()
      assert.equal(member?.role, "attorney")
    }
  })

  test("litigation_support-equivalent restriction: a non attorney/admin/investigator member cannot exclude evidence", async () => {
    // Demote conceptually by testing the trigger directly: attempt the
    // exclude-shaped update as User B against User B's OWN evidence after
    // downgrading their own role to 'expert' (self-service downgrade is
    // allowed only because User B is also the matter's sole attorney/admin;
    // the trigger must still block the exclusion once the acting role is
    // not attorney/admin/investigator).
    const { error: downgradeError } = await clientB
      .from("matter_members")
      .update({ role: "expert" })
      .eq("matter_id", matterB.matterId)
      .eq("user_id", userBId)
    assert.equal(downgradeError, null, "setup: downgrading own role should succeed (attorney/admin manage membership)")

    const { error } = await clientB.from("evidence").update({ is_excluded: true, excluded_reason: "test" }).eq("id", matterB.evidenceId)
    assert.ok(error, "an 'expert' role member must not be able to exclude evidence at the database boundary")
  })

  test("matter_members insert policy still requires an existing attorney/admin of that specific matter (no self-admission)", async () => {
    const { error } = await clientA.from("matter_members").insert({ matter_id: matterA.matterId, user_id: userBId, role: "attorney" })
    // clientA IS attorney/admin of Matter A, so this should actually
    // succeed for adding a THIRD PARTY to their own matter — verifying the
    // policy allows legitimate same-matter admin actions, not just that it
    // blocks illegitimate ones.
    assert.equal(error, null, "an attorney of Matter A should be able to add a member to Matter A")
  })
})
