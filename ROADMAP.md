# MatterPilot / TraceLine Roadmap

This is the ordered product plan for continuing the current build. Completed work stays documented here so future slices build on the existing system instead of replacing it.

## Current foundation — implemented

- TraceLine matter intelligence: matters, questions, propositions, subjects, attributes, leads, sources, evidence, annotations, links, events, statements, contradictions, analysis drafts, and cited reports.
- MatterPilot dashboard with calendar, appointments, clickable date/time slots, calendar notes, readiness states, preparation tasks, conflict checks, deadlines, contacts, intake review, public booking, communications outbox, and client preparation packets.
- Ready-made intake questionnaire, engagement letter, consultation and litigation preparation documents with attorney draft/final review.
- Secure one-time, expiring, revocable client preparation links at `/prepare/[token]`.
- Supabase authentication, matter-level RLS, cross-matter integrity, protected audit/review decisions, role-aware writes, and live security tests.
- GitHub `main` and Vercel deployment configured with encrypted environment variables.

## Phase 1 — production readiness

- [x] Add a safe environment template and runtime configuration checks.
- [x] Add a public health endpoint for deployment checks.
- [x] Add baseline security response headers.
- [x] Keep public booking and client packet routes reachable without staff login.
- [ ] Decide whether to disable Vercel Deployment Protection for external testers.
- [ ] Configure the production domain and Supabase auth redirect URLs.
- [ ] Connect a real transactional email provider and deliver queued messages/reminders.
- [ ] Add error monitoring, structured request logging, and deployment smoke checks.

## Phase 2 — document system

- [x] Add private, matter-scoped Supabase Storage for evidence artifacts with signed downloads, file validation, SHA-256 hashes, and RLS-backed metadata.
- [x] Add server-generated branded PDFs and in-app report previews/downloads for the two live evidence reports.
- [x] Add immutable document version history and explicit client-visible versus internal-only permissions for preparation documents.
- [x] Add template-defined fillable fields and a reviewable typed-name signature-attestation workflow.
- [x] Add upload, download, replacement, and retention controls.

## Phase 3 — client portal

- [x] Expand the current preparation packet into a matter-level client portal.
- [x] Add verified client access and multiple matters per client.
- [x] Add client document upload, private storage, request tracking, and firm review.
- [x] Add client messages, matter updates, appointment details, and task checklist.
- [x] Add portal activity history and access revocation controls.

## Phase 4 — scheduling and calendar

- [x] Replace seeded week dates with data-driven week navigation and real appointment ranges.
- [x] Add month/day calendar views and drag-and-drop event movement.
- [x] Add drag-and-drop rescheduling and event movement history.
- [x] Add configurable matter availability, time zones, blackout windows, and conflict-safe public booking.
- [x] Add conflict-safe staff rescheduling with an appointment history record.
- [x] Add recurring appointments and a firm-wide appointment series model.
- [ ] Add Google Calendar and Outlook synchronization.
- [x] Improve overlap handling with database-backed checks for new appointments, public requests, blocked windows, and reschedules.
- [x] Add richer readiness filters and conflict-aware calendar movement.

## Phase 5 — intake, contacts, tasks, and deadlines

- [x] Add duplicate contact detection and cross-matter contact history.
- [x] Add conflict search across people and organizations for intake review.
- [x] Add intake acceptance that creates a matter and starts engagement workflows.
- [x] Add task owners, dependencies, due dates, and workload/team assignment views.
- [ ] Add recurring tasks, notifications, and court-rule calculations.

## Phase 6 — reporting and firm operations

- [ ] Add the remaining report types with PDF export and report history.
- [ ] Add matter activity and communication timelines.
- [ ] Add time tracking, billing integrations, and client billing status later in the product cycle.
- [ ] Add firm settings, templates, roles, retention, and export controls.

## Phase 7 — AI assistance

- [x] Connect AI-assisted analysis drafts through the existing human-review workflow (optional OpenAI provider).
- [ ] Add evidence-cited summaries, contradiction detection, timeline gaps, and missing-document suggestions.
- [ ] Add deposition-question and preparation-draft assistance.
- [ ] Add prompt/version tracking, redaction, cost controls, and model audit records.

## Quality bar for every slice

- Matter isolation and role boundaries remain enforced in the database.
- Client-visible content is explicitly approved before sharing.
- Typecheck, lint, build, security tests, and relevant browser walkthroughs pass.
- Empty, loading, error, denied, expired, and mobile states are real and tested.
- No provider integration is represented as live until delivery or response is actually verified.
