/**
 * Seeds one fully worked fictional matter — "State v. Marcus Whitfield" —
 * against the LINKED REMOTE Supabase project, using the service-role key.
 * Run with: npm run seed
 *
 * Idempotent: exits early if the matter already exists.
 */
import { config } from "dotenv"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

import type { Database } from "../lib/supabase/types"

config({ path: resolve(process.cwd(), ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const MATTER_NUMBER = "24-CR-04471"
const DEMO_PASSWORD = "TraceLine-Demo-2026!"

async function getOrCreateUser(email: string, fullName: string) {
  const { data: existing } = await admin.auth.admin.listUsers()
  const found = existing?.users.find((u) => u.email === email)
  if (found) return found.id

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error || !data.user) throw error ?? new Error(`Failed to create ${email}`)
  return data.user.id
}

async function ensureMatterPilot(matterId: string, createdBy: string) {
  const { data: appointmentTypes, error: typeError } = await admin
    .from("appointment_types")
    .upsert([
      { matter_id: matterId, name: "Initial consultation", duration_minutes: 45, category: "consultation", created_by: createdBy },
      { matter_id: matterId, name: "Client meeting", duration_minutes: 60, category: "meeting", created_by: createdBy },
      { matter_id: matterId, name: "Deposition preparation", duration_minutes: 90, category: "deposition", created_by: createdBy },
      { matter_id: matterId, name: "Mediation", duration_minutes: 120, category: "mediation", created_by: createdBy },
    ], { onConflict: "matter_id,name" })
    .select("id, name")
  if (typeError || !appointmentTypes) throw typeError ?? new Error("Failed to seed MatterPilot appointment types")

  const { error: pageError } = await admin
    .from("booking_pages")
    .upsert({ matter_id: matterId, slug: "demo", firm_name: "Harbor Legal", active: true, created_by: createdBy }, { onConflict: "slug" })
  if (pageError) throw pageError
  const { data: demoPage, error: demoPageError } = await admin.from("booking_pages").select("id").eq("slug", "demo").single()
  if (demoPageError || !demoPage) throw demoPageError ?? new Error("Demo booking page was not returned")

  const { data: existingRequests, error: requestError } = await admin
    .from("booking_requests")
    .select("id")
    .eq("matter_id", matterId)
    .eq("status", "pending")
    .limit(1)
  if (requestError) throw requestError
  if (!existingRequests?.length) {
    const { error: requestInsertError } = await admin.from("booking_requests").insert({
      matter_id: matterId,
      booking_page_id: demoPage.id,
      appointment_type_name: "Initial consultation",
      requested_start: "2026-09-25T18:00:00Z",
      full_name: "Taylor Brooks",
      email: "taylor.brooks@example.com",
      summary: "I need help understanding the next steps in a criminal defense matter and would like to discuss the timeline.",
      status: "pending",
    })
    if (requestInsertError) throw requestInsertError
  }

  const { data: existingAppointments, error: existingError } = await admin
    .from("appointments")
    .select("id, title")
    .eq("matter_id", matterId)
  if (existingError) throw existingError
  await Promise.all([
    admin.from("appointments").update({ workflow_key: "deposition_preparation" }).eq("id", existingAppointments?.find((appointment) => appointment.title === "Deposition preparation")?.id ?? ""),
    admin.from("appointments").update({ workflow_key: "mediation" }).eq("id", existingAppointments?.find((appointment) => appointment.title === "Mediation conference")?.id ?? ""),
    admin.from("appointments").update({ workflow_key: "expert_consultation" }).eq("id", existingAppointments?.find((appointment) => appointment.title === "Expert review")?.id ?? ""),
  ])
  if (existingAppointments?.length) return

  const typeId = (name: string) => appointmentTypes.find((type) => type.name === name)?.id ?? null
  const { data: appointments, error: appointmentError } = await admin
    .from("appointments")
    .insert([
      { matter_id: matterId, appointment_type_id: typeId("Deposition preparation"), workflow_key: "deposition_preparation", title: "Deposition preparation", starts_at: "2026-09-21T14:00:00Z", ends_at: "2026-09-21T15:30:00Z", status: "confirmed", conflict_status: "clear", location: "Conference room 2", client_name: "Dana Ruiz", created_by: createdBy },
      { matter_id: matterId, appointment_type_id: typeId("Mediation"), workflow_key: "mediation", title: "Mediation conference", starts_at: "2026-09-22T16:00:00Z", ends_at: "2026-09-22T18:00:00Z", status: "tentative", conflict_status: "issue", location: "Carter ADR · Room 4", client_name: "Northstar LLC", created_by: createdBy },
      { matter_id: matterId, appointment_type_id: typeId("Expert meeting"), workflow_key: "expert_consultation", title: "Expert review", starts_at: "2026-09-23T15:00:00Z", ends_at: "2026-09-23T16:30:00Z", status: "confirmed", conflict_status: "clear", location: "Video call · Teams", client_name: "Dr. Priya Abbas", created_by: createdBy },
    ])
    .select("id, title")
  if (appointmentError || !appointments) throw appointmentError ?? new Error("Failed to seed MatterPilot appointments")

  const mediation = appointments.find((appointment) => appointment.title === "Mediation conference")
  const deposition = appointments.find((appointment) => appointment.title === "Deposition preparation")
  const expert = appointments.find((appointment) => appointment.title === "Expert review")
  if (!mediation || !deposition || !expert) throw new Error("Seeded appointments were not returned")

  await admin.from("appointment_tasks").insert([
    { matter_id: matterId, appointment_id: deposition.id, label: "Conflict check complete", status: "done", is_blocking: true, created_by: createdBy },
    { matter_id: matterId, appointment_id: deposition.id, label: "Witness statement reviewed", status: "done", is_blocking: true, created_by: createdBy },
    { matter_id: matterId, appointment_id: mediation.id, label: "Conflict check complete", status: "done", is_blocking: true, created_by: createdBy },
    { matter_id: matterId, appointment_id: mediation.id, label: "Mediation statement approved", status: "open", is_blocking: true, created_by: createdBy },
    { matter_id: matterId, appointment_id: expert.id, label: "Materials shared", status: "done", is_blocking: true, created_by: createdBy },
  ])
  await admin.from("appointment_documents").insert([
    { matter_id: matterId, appointment_id: deposition.id, name: "Deposition notice", status: "received", is_required: true, created_by: createdBy },
    { matter_id: matterId, appointment_id: deposition.id, name: "Witness packet", status: "received", is_required: true, created_by: createdBy },
    { matter_id: matterId, appointment_id: mediation.id, name: "Mediation statement", status: "requested", is_required: true, created_by: createdBy },
    { matter_id: matterId, appointment_id: expert.id, name: "Expert packet", status: "received", is_required: true, created_by: createdBy },
  ])
  await admin.from("appointment_participants").insert([
    { matter_id: matterId, appointment_id: deposition.id, display_name: "Dana Ruiz", participant_role: "witness", response_status: "confirmed", is_required: true },
    { matter_id: matterId, appointment_id: mediation.id, display_name: "Northstar LLC", participant_role: "client", response_status: "pending", is_required: true },
    { matter_id: matterId, appointment_id: expert.id, display_name: "Dr. Priya Abbas", participant_role: "expert", response_status: "confirmed", is_required: true },
  ])
  await admin.from("appointment_reminders").insert([
    { matter_id: matterId, appointment_id: deposition.id, channel: "email", send_at: "2026-09-20T14:00:00Z", status: "planned" },
    { matter_id: matterId, appointment_id: mediation.id, channel: "email", send_at: "2026-09-21T16:00:00Z", status: "planned" },
    { matter_id: matterId, appointment_id: expert.id, channel: "email", send_at: "2026-09-22T15:00:00Z", status: "planned" },
  ])
}

async function main() {
  const { data: existingMatter } = await admin.from("matters").select("id").eq("matter_number", MATTER_NUMBER).maybeSingle()
  if (existingMatter) {
    const { data: existingMatterRow, error: existingMatterError } = await admin.from("matters").select("id, created_by").eq("id", existingMatter.id).single()
    if (existingMatterError || !existingMatterRow) throw existingMatterError ?? new Error("Existing matter not found")
    await ensureMatterPilot(existingMatterRow.id, existingMatterRow.created_by)
    console.log(`Matter ${MATTER_NUMBER} already seeded (id: ${existingMatter.id}). Nothing to do.`)
    return
  }

  console.log("Creating fictional demo accounts…")
  const attorneyId = await getOrCreateUser("demo.attorney@traceline.local", "Priya Anand")
  const investigatorId = await getOrCreateUser("demo.investigator@traceline.local", "Sam Okafor")
  const paralegalId = await getOrCreateUser("demo.paralegal@traceline.local", "Jordan Lee")

  console.log("Creating matter…")
  const { data: matter, error: matterError } = await admin
    .from("matters")
    .insert({
      matter_number: MATTER_NUMBER,
      name: "State v. Marcus Whitfield",
      case_mode: "criminal_defense",
      jurisdiction: "County of Alameda",
      venue: "Superior Court, Dept. 12",
      status: "active",
      next_deadline_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      defense_theory:
        "Mr. Whitfield was at his shift at Bell Logistics until 23:40 and could not have been at Riverside Storage at the time of the incident. The eyewitness account describes a vehicle consistent with one owned by his cousin, Ray Whitfield, who has an unrelated prior at the same storage facility.",
      opposing_theory:
        "An eyewitness places a vehicle matching the defendant's at Riverside Storage at approximately 23:15, shortly before the reported break-in, and the defendant's presence at his listed workplace is not independently confirmed by anyone other than a timeclock record.",
      alternative_explanations:
        "The vehicle seen at 23:15 may belong to Ray Whitfield (a similar make, model, and color), who has not been ruled out as present at the scene. Timeclock records could reflect a badge swipe by a coworker rather than physical presence.",
      created_by: attorneyId,
    })
    .select("id")
    .single()
  if (matterError || !matter) throw matterError

  const matterId = matter.id

  console.log("Adding matter members…")
  await admin.from("matter_members").insert([
    { matter_id: matterId, user_id: attorneyId, role: "attorney" },
    { matter_id: matterId, user_id: investigatorId, role: "investigator" },
    { matter_id: matterId, user_id: paralegalId, role: "litigation_support" },
  ])

  console.log("Adding sources…")
  const { data: sources } = await admin
    .from("sources")
    .insert([
      { matter_id: matterId, source_type: "business_record", name: "Bell Logistics HR records", custodian: "Bell Logistics HR", created_by: investigatorId },
      { matter_id: matterId, source_type: "digital_forensics", name: "Riverside Storage security system", custodian: "Riverside Storage Inc.", created_by: investigatorId },
      { matter_id: matterId, source_type: "witness_interview", name: "Dana Ruiz interview", custodian: "Defense investigation file", created_by: investigatorId },
      { matter_id: matterId, source_type: "public_record", name: "DMV vehicle registration records", custodian: "California DMV", created_by: investigatorId },
      { matter_id: matterId, source_type: "law_enforcement_report", name: "Police incident report #24-8817", custodian: "County Sheriff's Office", created_by: investigatorId },
    ])
    .select("id, name")
  if (!sources) throw new Error("Failed to create sources")
  const sourceId = (name: string) => sources.find((s) => s.name === name)!.id

  console.log("Adding subjects…")
  const { data: subjects } = await admin
    .from("subjects")
    .insert([
      { matter_id: matterId, subject_type: "person", display_name: "Marcus Whitfield", summary: "Defendant.", created_by: investigatorId },
      { matter_id: matterId, subject_type: "witness", display_name: "Dana Ruiz", summary: "Eyewitness who reported seeing a vehicle near Riverside Storage.", created_by: investigatorId },
      { matter_id: matterId, subject_type: "person", display_name: "Ray Whitfield", summary: "Defendant's cousin. Owns a vehicle of similar make, model, and color.", created_by: investigatorId },
      { matter_id: matterId, subject_type: "business", display_name: "Bell Logistics", summary: "Defendant's employer; shift ended 23:40 per timeclock.", created_by: investigatorId },
      { matter_id: matterId, subject_type: "business", display_name: "Riverside Storage", summary: "Site of the reported incident.", created_by: investigatorId },
    ])
    .select("id, display_name")
  if (!subjects) throw new Error("Failed to create subjects")
  const subjectId = (name: string) => subjects.find((s) => s.display_name === name)!.id

  console.log("Capturing evidence…")
  const evidenceRows = [
    {
      matter_id: matterId,
      evidence_number: "EV-001",
      title: "Bell Logistics timeclock export — Sept 14",
      artifact_type: "document",
      source_id: sourceId("Bell Logistics HR records"),
      source_locator: "HR-EXPORT-0914-MW",
      event_date: "2026-09-14T23:40:00Z",
      captured_at: "2026-09-16T09:00:00Z",
      record_date: "2026-09-14T23:41:00Z",
      collector: "Sam Okafor",
      custodian: "Bell Logistics HR",
      artifact_ref: "case-files/EV-001-timeclock.pdf",
      provenance_status: "verified",
      identity_match_status: "confirmed",
      relevance: "high",
      authentication_status: "stipulated",
      review_state: "reviewed",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_number: "EV-002",
      title: "Riverside Storage exterior camera footage — 23:10–23:20",
      artifact_type: "video",
      source_id: sourceId("Riverside Storage security system"),
      source_locator: "CAM-04, clip 2026-09-14_2310",
      event_date: "2026-09-14T23:15:00Z",
      captured_at: "2026-09-15T14:00:00Z",
      record_date: "2026-09-14T23:15:00Z",
      collector: "Sam Okafor",
      custodian: "Riverside Storage Inc.",
      artifact_ref: "case-files/EV-002-camera-clip.mp4",
      provenance_status: "disputed",
      identity_match_status: "possible",
      relevance: "high",
      authentication_status: "disputed",
      review_state: "flagged",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_number: "EV-003",
      title: "Dana Ruiz witness statement transcript",
      artifact_type: "testimony",
      source_id: sourceId("Dana Ruiz interview"),
      source_locator: "Interview tr. p.1–4",
      event_date: "2026-09-14T23:30:00Z",
      captured_at: "2026-09-18T10:00:00Z",
      record_date: "2026-09-18T10:00:00Z",
      collector: "Sam Okafor",
      custodian: "Defense investigation file",
      artifact_ref: "case-files/EV-003-ruiz-transcript.pdf",
      provenance_status: "reported",
      identity_match_status: "unresolved",
      relevance: "high",
      authentication_status: "unauthenticated",
      review_state: "reviewed",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_number: "EV-004",
      title: "Investigator drive-time analysis memo",
      artifact_type: "document",
      source_locator: "Internal work product",
      event_date: null,
      captured_at: "2026-09-20T00:00:00Z",
      record_date: "2026-09-20T00:00:00Z",
      collector: "Sam Okafor",
      custodian: "Defense investigation file",
      artifact_ref: "case-files/EV-004-drive-time-memo.pdf",
      provenance_status: "inferred",
      identity_match_status: "unresolved",
      relevance: "medium",
      authentication_status: "not_applicable",
      review_state: "under_review",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_number: "EV-005",
      title: "DMV registration — Ray Whitfield vehicle",
      artifact_type: "public_record",
      source_id: sourceId("DMV vehicle registration records"),
      source_locator: "DMV rec. #RW-88213",
      event_date: null,
      captured_at: "2026-09-19T00:00:00Z",
      record_date: "2026-09-19T00:00:00Z",
      collector: "Sam Okafor",
      custodian: "California DMV",
      artifact_ref: "case-files/EV-005-dmv-registration.pdf",
      provenance_status: "verified",
      identity_match_status: "confirmed",
      relevance: "medium",
      authentication_status: "authenticated",
      review_state: "reviewed",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_number: "EV-006",
      title: "Defendant post-arrest interview transcript",
      artifact_type: "testimony",
      source_id: sourceId("Police incident report #24-8817"),
      source_locator: "Incident rpt. #24-8817, exh. C",
      event_date: "2026-09-15T08:00:00Z",
      captured_at: "2026-09-15T08:00:00Z",
      record_date: "2026-09-15T08:00:00Z",
      collector: "County Sheriff's Office",
      custodian: "County Sheriff's Office",
      artifact_ref: "case-files/EV-006-interview-transcript.pdf",
      provenance_status: "reported",
      identity_match_status: "confirmed",
      relevance: "medium",
      authentication_status: "stipulated",
      review_state: "reviewed",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_number: "EV-007",
      title: "Supplemental police report — witness canvas",
      artifact_type: "public_record",
      source_id: sourceId("Police incident report #24-8817"),
      source_locator: "Incident rpt. #24-8817, supp. 2",
      event_date: "2026-09-14T23:20:00Z",
      // Logged far later than the event it describes — flags as late-created on the timeline.
      captured_at: "2026-12-30T00:00:00Z",
      record_date: "2026-12-30T00:00:00Z",
      collector: "County Sheriff's Office",
      custodian: "County Sheriff's Office",
      artifact_ref: "case-files/EV-007-supplemental-report.pdf",
      provenance_status: "unknown",
      identity_match_status: "unresolved",
      relevance: "low",
      authentication_status: "unauthenticated",
      review_state: "new",
      created_by: investigatorId,
    },
  ] as const

  const { data: evidence } = await admin.from("evidence").insert(evidenceRows as never).select("id, evidence_number")
  if (!evidence) throw new Error("Failed to create evidence")
  const evidenceId = (num: string) => evidence.find((e) => e.evidence_number === num)!.id

  console.log("Adding entity attributes…")
  await admin.from("entity_attributes").insert([
    {
      matter_id: matterId,
      subject_id: subjectId("Marcus Whitfield"),
      attribute_key: "Employer",
      attribute_value: "Bell Logistics — warehouse associate",
      status: "verified",
      evidence_id: evidenceId("EV-001"),
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      subject_id: subjectId("Marcus Whitfield"),
      attribute_key: "Vehicle",
      attribute_value: "2019 silver Honda Civic",
      status: "reported",
      evidence_id: evidenceId("EV-006"),
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      subject_id: subjectId("Ray Whitfield"),
      attribute_key: "Vehicle",
      attribute_value: "2018 silver Honda Civic",
      status: "verified",
      evidence_id: evidenceId("EV-005"),
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      subject_id: subjectId("Dana Ruiz"),
      attribute_key: "Vantage point",
      attribute_value: "Across the street, approx. 40 yards from the loading entrance",
      status: "reported",
      evidence_id: evidenceId("EV-003"),
      created_by: investigatorId,
    },
  ])

  console.log("Adding questions and propositions…")
  const { data: questions } = await admin
    .from("questions")
    .insert([
      {
        matter_id: matterId,
        prompt: "Was Marcus Whitfield present at Riverside Storage at approximately 23:15?",
        owner_id: investigatorId,
        priority: "high",
        status: "in_progress",
        created_by: attorneyId,
      },
      {
        matter_id: matterId,
        prompt: "Does Dana Ruiz's identification of the vehicle hold up against the alibi evidence?",
        owner_id: attorneyId,
        priority: "high",
        status: "open",
        created_by: attorneyId,
      },
    ])
    .select("id, prompt")
  if (!questions) throw new Error("Failed to create questions")
  const questionId = (prompt: string) => questions.find((q) => q.prompt === prompt)!.id

  const q1 = questionId("Was Marcus Whitfield present at Riverside Storage at approximately 23:15?")
  const q2 = questionId("Does Dana Ruiz's identification of the vehicle hold up against the alibi evidence?")

  const { data: propositions, error: propositionsError } = await admin
    .from("propositions")
    .insert([
      {
        matter_id: matterId,
        question_id: q1,
        statement: "Mr. Whitfield was still clocked in at Bell Logistics at 23:40, after the reported incident time.",
        status: "supported",
        assumptions: "Timeclock badge was used by Mr. Whitfield personally.",
        next_action: "Obtain shift-supervisor corroboration of physical presence, not just badge swipe.",
        created_by: attorneyId,
      },
      {
        matter_id: matterId,
        question_id: q1,
        statement: "The vehicle seen on camera at 23:15 belongs to Ray Whitfield, not Marcus Whitfield.",
        status: "unresolved",
        assumptions: "Vehicle color/make identification from grainy footage is reliable enough to compare against DMV records.",
        next_action: "Request higher-resolution export of EV-002 and canvas for Ray Whitfield's whereabouts that night.",
        created_by: attorneyId,
      },
      {
        matter_id: matterId,
        question_id: q2,
        statement: "Dana Ruiz's vantage point and lighting conditions support a reliable vehicle-color identification.",
        status: "contradicted",
        assumptions: null,
        next_action: "Obtain lighting conditions report for the block at the relevant time.",
        created_by: attorneyId,
      },
    ])
    .select("id, statement")
  if (!propositions) {
    console.error(propositionsError)
    throw new Error("Failed to create propositions")
  }
  const propId = (statement: string) => propositions.find((p) => p.statement === statement)!.id

  console.log("Linking evidence to propositions…")
  await admin.from("evidence_links").insert([
    {
      matter_id: matterId,
      evidence_id: evidenceId("EV-001"),
      proposition_id: propId("Mr. Whitfield was still clocked in at Bell Logistics at 23:40, after the reported incident time."),
      relationship: "supports",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_id: evidenceId("EV-003"),
      proposition_id: propId("Mr. Whitfield was still clocked in at Bell Logistics at 23:40, after the reported incident time."),
      relationship: "contradicts",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_id: evidenceId("EV-005"),
      proposition_id: propId("The vehicle seen on camera at 23:15 belongs to Ray Whitfield, not Marcus Whitfield."),
      relationship: "supports",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_id: evidenceId("EV-002"),
      proposition_id: propId("The vehicle seen on camera at 23:15 belongs to Ray Whitfield, not Marcus Whitfield."),
      relationship: "mentions",
      created_by: investigatorId,
    },
    {
      matter_id: matterId,
      evidence_id: evidenceId("EV-003"),
      proposition_id: propId("Dana Ruiz's vantage point and lighting conditions support a reliable vehicle-color identification."),
      relationship: "contradicts",
      created_by: investigatorId,
    },
  ])

  console.log("Adding timeline events…")
  const { data: events } = await admin
    .from("events")
    .insert([
      {
        matter_id: matterId,
        title: "Dana Ruiz reports seeing a silver sedan near Riverside Storage",
        description: "Witness reports a vehicle matching a silver Honda Civic parked near the loading entrance.",
        event_start: "2026-09-14T23:15:00Z",
        confidence: "reported",
        category: "statement",
        favorability: "adverse",
        primary_evidence_id: evidenceId("EV-003"),
        created_by: investigatorId,
      },
      {
        matter_id: matterId,
        title: "Riverside Storage camera captures unidentified figure",
        description: "Exterior camera footage shows a figure near the loading dock; identity disputed.",
        event_start: "2026-09-14T23:15:00Z",
        confidence: "disputed",
        category: "fact",
        favorability: "adverse",
        primary_evidence_id: evidenceId("EV-002"),
        created_by: investigatorId,
      },
      {
        matter_id: matterId,
        title: "Marcus Whitfield clocks out at Bell Logistics",
        description: "Timeclock records Mr. Whitfield's badge swipe at end of shift.",
        event_start: "2026-09-14T23:40:00Z",
        confidence: "verified",
        category: "fact",
        favorability: "favorable",
        primary_evidence_id: evidenceId("EV-001"),
        created_by: investigatorId,
      },
      {
        matter_id: matterId,
        title: "Defendant interviewed post-arrest",
        description: "Mr. Whitfield states he was at work until his normal shift end and drove directly home.",
        event_start: "2026-09-15T08:00:00Z",
        confidence: "reported",
        category: "statement",
        favorability: "neutral",
        primary_evidence_id: evidenceId("EV-006"),
        created_by: investigatorId,
      },
      {
        matter_id: matterId,
        title: "Supplemental witness canvas filed",
        description: "Sheriff's office files a supplemental report on additional canvassing around the scene.",
        event_start: "2026-09-14T23:20:00Z",
        confidence: "unknown",
        category: "filing",
        favorability: "neutral",
        primary_evidence_id: evidenceId("EV-007"),
        created_by: investigatorId,
        // Backdated created_at to demonstrate the timeline's late-created-record
        // flag: this event was logged in TraceLine long after it occurred.
        created_at: "2026-12-30T00:00:00Z",
      },
    ])
    .select("id, title")
  if (!events) throw new Error("Failed to create events")

  console.log("Adding statements…")
  const { data: statements } = await admin
    .from("statements")
    .insert([
      {
        matter_id: matterId,
        subject_id: subjectId("Dana Ruiz"),
        evidence_id: evidenceId("EV-003"),
        content: "I saw a silver sedan pull up near the loading dock around 11:30 at night.",
        statement_date: "2026-09-14T23:30:00Z",
        status: "reported",
        created_by: investigatorId,
      },
      {
        matter_id: matterId,
        subject_id: subjectId("Marcus Whitfield"),
        evidence_id: evidenceId("EV-006"),
        content: "I was at work at Bell Logistics until my shift ended, then drove straight home.",
        statement_date: "2026-09-15T08:00:00Z",
        status: "reported",
        created_by: investigatorId,
      },
    ])
    .select("id")
  if (!statements) throw new Error("Failed to create statements")

  console.log("Logging the open lead (evidence gap)…")
  await admin.from("leads").insert([
    {
      matter_id: matterId,
      subject_id: subjectId("Ray Whitfield"),
      question_id: q1,
      description: "Obtain ALPR (automated license plate reader) data from nearby intersections to corroborate or rule out either vehicle near Riverside Storage around 23:15.",
      status: "open",
      assigned_to: investigatorId,
      created_by: attorneyId,
    },
  ])

  console.log("Logging the contradiction and adversarial review…")
  const { data: contradiction } = await admin
    .from("contradictions")
    .insert({
      matter_id: matterId,
      title: "Vehicle-at-scene timing vs. workplace alibi",
      conflict_type: "temporal",
      side_a_label: "Eyewitness account (Dana Ruiz)",
      side_a_summary: "Ms. Ruiz reports seeing a silver sedan matching the defendant's vehicle near Riverside Storage at approximately 23:15.",
      side_b_label: "Employer timeclock (Bell Logistics)",
      side_b_summary: "Timeclock records show Mr. Whitfield's badge swiped out at 23:40, after the reported sighting, at a location roughly 20 minutes' drive away.",
      statement_a_id: statements[0].id,
      statement_b_id: statements[1].id,
      proposition_a_id: propId("The vehicle seen on camera at 23:15 belongs to Ray Whitfield, not Marcus Whitfield."),
      proposition_b_id: propId("Mr. Whitfield was still clocked in at Bell Logistics at 23:40, after the reported incident time."),
      plausible_alternative_explanations:
        "The vehicle seen may belong to Ray Whitfield, who owns a visually similar car and has not been excluded as being in the area. Alternatively, the timeclock badge could have been swiped by a coworker on Mr. Whitfield's behalf.",
      missing_evidence:
        "ALPR data from nearby intersections; higher-resolution export of the storage camera footage; confirmation from a Bell Logistics supervisor who physically saw Mr. Whitfield at 23:40.",
      impact_if_a:
        "If the eyewitness identification is accurate and not Ray Whitfield's vehicle, it substantially undermines the alibi and places a similar vehicle at the scene near the incident time.",
      impact_if_b:
        "If the timeclock reliably reflects Mr. Whitfield's physical presence, it is very difficult for him to have been at Riverside Storage at 23:15 given the drive time between locations.",
      resolution_status: "unresolved",
      created_by: attorneyId,
    })
    .select("id")
    .single()
  if (!contradiction) throw new Error("Failed to create contradiction")

  await admin.from("contradiction_evidence").insert([
    { matter_id: matterId, contradiction_id: contradiction.id, side: "a", evidence_id: evidenceId("EV-003"), created_by: investigatorId },
    { matter_id: matterId, contradiction_id: contradiction.id, side: "a", evidence_id: evidenceId("EV-002"), created_by: investigatorId },
    { matter_id: matterId, contradiction_id: contradiction.id, side: "b", evidence_id: evidenceId("EV-001"), created_by: investigatorId },
    { matter_id: matterId, contradiction_id: contradiction.id, side: "b", evidence_id: evidenceId("EV-004"), created_by: investigatorId },
  ])

  await admin.from("contradiction_reviews").insert({
    matter_id: matterId,
    contradiction_id: contradiction.id,
    weakest_assumption: "That Dana Ruiz's vehicle-color identification from 40 yards at night is reliable enough to distinguish between two visually similar silver sedans.",
    evidence_against_theory: "EV-005 shows Ray Whitfield owns a nearly identical vehicle and has not been excluded as being in the area that night.",
    correlation_vs_causation: "The timeclock badge swipe correlates with Mr. Whitfield's presence but does not, alone, prove physical presence — it could reflect a colleague swiping on his behalf.",
    absence_of_evidence_check: "The absence of a clearer camera image of the driver is being treated as inconclusive, not as proof the driver was Mr. Whitfield.",
    opposing_counsel_attack: "Opposing counsel will likely argue the defense theory about Ray Whitfield's vehicle is speculative without direct evidence placing him at the scene.",
    fact_that_would_weaken_conclusion: "ALPR data placing Mr. Whitfield's own vehicle at or near Riverside Storage around 23:15 would substantially weaken the alibi theory.",
    reviewed_by: attorneyId,
    reviewed_at: new Date().toISOString(),
  })

  console.log("Adding analysis…")
  const { data: analysis } = await admin
    .from("analyses")
    .insert({
      matter_id: matterId,
      proposition_id: propId("The vehicle seen on camera at 23:15 belongs to Ray Whitfield, not Marcus Whitfield."),
      question_id: q1,
      title: "Vehicle identification and alibi timing analysis",
      summary: "Assessing whether the eyewitness vehicle identification is consistent with the defendant's timeclock-supported alibi.",
      supporting_evidence_summary: "EV-001 (timeclock) and EV-005 (Ray Whitfield's DMV registration) support the defense theory.",
      contradicting_evidence_summary: "EV-003 (witness statement) and EV-002 (camera footage) place a similar vehicle at the scene near the relevant time.",
      missing_evidence_summary: "ALPR data and a higher-resolution camera export are not yet obtained (see open lead).",
      confidence_assessment: "moderate",
      key_assumptions: "Timeclock badge swipes reflect the badge holder's physical presence.",
      limitations: "Camera footage resolution limits reliable vehicle identification; witness identification has not been tested for lighting/distance reliability.",
      recommended_next_steps: "Pursue ALPR records and a lighting-conditions expert review before drawing a firm conclusion.",
      generated_by: "human",
      status: "under_review",
      authored_by: attorneyId,
    })
    .select("id")
    .single()
  if (!analysis) throw new Error("Failed to create analysis")

  const { data: conclusions } = await admin
    .from("analysis_conclusions")
    .insert([
      {
        matter_id: matterId,
        analysis_id: analysis.id,
        conclusion_text: "Mr. Whitfield's timeclock badge was swiped out at 23:40 at Bell Logistics.",
        classification: "verified_fact",
        created_by: attorneyId,
      },
      {
        matter_id: matterId,
        analysis_id: analysis.id,
        conclusion_text: "Dana Ruiz reported seeing a silver sedan near Riverside Storage at approximately 23:15.",
        classification: "source_reported_assertion",
        created_by: attorneyId,
      },
      {
        matter_id: matterId,
        analysis_id: analysis.id,
        conclusion_text: "The vehicle observed was more likely Ray Whitfield's than Mr. Whitfield's, given the drive-time constraint.",
        classification: "hypothesis",
        created_by: attorneyId,
      },
      {
        matter_id: matterId,
        analysis_id: analysis.id,
        conclusion_text: "Whether Ray Whitfield was in the vicinity of Riverside Storage that night.",
        classification: "unknown",
        created_by: attorneyId,
      },
    ])
    .select("id, classification")
  if (!conclusions) throw new Error("Failed to create analysis conclusions")

  const conclusionId = (classification: string) => conclusions.find((c) => c.classification === classification)!.id

  await admin.from("analysis_conclusion_evidence").insert([
    { matter_id: matterId, conclusion_id: conclusionId("verified_fact"), evidence_id: evidenceId("EV-001"), locator_note: "Timeclock export, row 14" },
    { matter_id: matterId, conclusion_id: conclusionId("source_reported_assertion"), evidence_id: evidenceId("EV-003"), locator_note: "Interview transcript p.2" },
    { matter_id: matterId, conclusion_id: conclusionId("hypothesis"), evidence_id: evidenceId("EV-005"), locator_note: "DMV registration record" },
  ])

  await ensureMatterPilot(matterId, attorneyId)

  console.log(`\nSeed complete. Matter id: ${matterId}`)
  console.log("Demo accounts (password for all: " + DEMO_PASSWORD + "):")
  console.log("  demo.attorney@traceline.local (attorney)")
  console.log("  demo.investigator@traceline.local (investigator)")
  console.log("  demo.paralegal@traceline.local (litigation_support — restricted role, for permission-state testing)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
