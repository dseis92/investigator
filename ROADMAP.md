# MatterPilot / TraceLine — Operating Roadmap

This is the living plan for taking the current MatterPilot and TraceLine build from a strong working product to a dependable, fully operated platform for law firms. It records what is complete, what is partially wired, and the order in which the remaining production work should be delivered.

The product doctrine remains unchanged: MatterPilot helps a firm organize intake, scheduling, readiness, documents, communications, and client work. TraceLine helps a human investigator or attorney organize evidence and analysis. The product must not become a people-search system, surveillance tool, autonomous legal decision-maker, legal-advice engine, or credibility scorer.

## Status legend

- `[x]` Implemented and verified in the application.
- `[~]` Implemented in part or wired in code, but still needs provider setup, production verification, or a remaining backend slice.
- `[ ]` Not yet implemented.

## Current snapshot

MatterPilot currently provides the core legal-operations workflow:

- Intake, conflict review, contact records, new-client scheduling, matter creation, and engagement workflow.
- A data-backed calendar with clickable date/time slots, appointments, calendar notes, recurring appointments, blocked time, deadlines, readiness states, conflict checks, and rescheduling history.
- Preparation tasks with owners, dependencies, due dates, recurring templates, court-rule calculations, notification queueing, and scheduled operations.
- Ready-made intake questionnaires, engagement letters, consultation preparation documents, litigation preparation documents, attorney review, and client-visible approval states.
- Secure client preparation links and a matter-level client portal with document requests, uploads, messages, updates, appointments, tasks, activity history, and access revocation.
- Communications outbox and scheduled notification delivery foundation.
- Firm and personal settings foundation, including the `user_preferences` migration, settings center, appearance/dashboard preferences, calendar preferences, notification preferences, portal preferences, integrations, security/audit, and billing/plan sections.

TraceLine currently provides:

- Questions, propositions, subjects, entity attributes, leads, sources, evidence, annotations, evidence links, events, statements, contradictions, analysis drafts, and cited reports.
- Private matter-scoped artifact storage with validation, SHA-256 hashes, signed downloads, replacement, retention controls, and RLS-backed metadata.
- Six report types with matter-scoped views, report history, branded PDF export, print-ready layouts, and human review gates.
- Optional AI-assisted analysis drafts and matter-brief assistance with redaction, prompt/model tracking, and required human review.

The security foundation includes Supabase authentication, matter-level RLS, cross-matter composite integrity, protected audit/review decisions, role-aware writes, security tests, encrypted Vercel environment variables, and a GitHub `main` → Vercel deployment path.

## Known partials — do not call these “live” yet

These capabilities exist in the repository but still require the work below before they are production-ready:

- Google Calendar and Outlook authorization/synchronization: OAuth routes, encrypted token storage, and selected-matter one-way push are present; provider registration, production callback configuration, live authorization, token refresh, retries, and end-to-end verification remain.
- Email: notification and communication records are present; a real transactional provider, verified sender identity, delivery webhooks, retry behavior, and production delivery verification remain.
- Settings: personal preferences are persisted; firm/workspace settings, team administration, granular permissions, shared branding, templates, retention policy, and export controls need firm-level storage and enforcement.
- Billing: time tracking and draft billing foundations exist; subscriptions, seats, invoices, payment collection, and billing-provider webhooks remain.
- AI: assisted drafts are available behind human review; evidence-cited summaries, contradiction and gap suggestions, document suggestions, deposition assistance, cost controls, and complete AI audit governance remain.

# Ordered delivery plan

## Phase 0 — production contract, reliability, and observability

This phase is the gate for every later integration. It makes the deployed application measurable, diagnosable, and safe to operate.

### Build

- [x] Maintain `.env.example` and runtime configuration checks without exposing secrets.
- [x] Add a public health endpoint suitable for deployment checks.
- [x] Add baseline security response headers.
- [x] Keep public booking and client packet routes reachable without staff login.
- [ ] Decide whether Vercel Deployment Protection should be disabled for the public production domain while keeping preview environments protected.
- [ ] Set the production domain, canonical URL, Supabase Site URL, and Supabase auth redirect allowlist.
- [ ] Add structured request IDs and server-side request logging with sensitive values redacted.
- [ ] Add error monitoring with environment, route, user-safe context, and release/version metadata.
- [ ] Add deployment smoke checks for health, login, matter access, booking, appointment creation, reports, portal access, and expired-link behavior.
- [ ] Document rollback, migration recovery, provider outage, email outage, and compromised-secret runbooks.
- [ ] Add backup/restore verification for database records, storage metadata, and generated documents.

### Acceptance gate

The production domain resolves correctly; login and public routes work from a clean browser; a failed request produces a traceable error without leaking private data; the smoke suite runs after deployment; and the team can identify and roll back a bad release.

## Phase 1 — communications and notification delivery

Scheduling, readiness, portal requests, and court deadlines only become operational when messages reliably reach the intended person.

### Build

- [ ] Select and configure one transactional email provider, with Resend as the simplest first implementation unless a firm chooses another provider.
- [ ] Verify the sending domain and sender identity; keep API keys only in Vercel Production/Preview environment variables.
- [ ] Implement branded templates for booking confirmation, booking changes, reminders, portal invitations, document requests, task assignments, deadline alerts, and readiness follow-ups.
- [ ] Add an idempotent delivery worker for the existing communications outbox and notification queue.
- [ ] Add retry/backoff, permanent-failure handling, provider response storage, delivery status, and a safe manual resend action.
- [ ] Add provider webhooks for delivered, bounced, complained, and suppressed messages.
- [ ] Add user and firm notification preferences, quiet hours, time-zone handling, digest options, and client opt-out behavior where appropriate.
- [ ] Add an in-app notification center so important events are not email-only.
- [ ] Verify a real production email from intake through delivery and record the result in the operations runbook.

### Acceptance gate

A new booking, document request, readiness task, and court deadline each produce the correct message; duplicate jobs do not duplicate messages; failures are visible and retryable; and client-visible content is never sent before approval.

## Phase 2 — firm settings and administration

The settings screen now exists and personal preferences are persisted. This phase turns the settings center into a real firm administration layer instead of a collection of future-facing controls.

### Build

- [x] Ship the personal settings foundation and `user_preferences` migration.
- [ ] Add a firm/workspace settings model with a clear owner and membership boundary.
- [ ] Persist firm identity, logo/brand colors, default time zone, business hours, date/time format, matter numbering, practice areas, and default appointment settings.
- [ ] Add team invitations, invitation expiry, member suspension, role assignment, and last-active/security visibility.
- [ ] Enforce roles and permissions in server actions and database policies, not only by hiding buttons.
- [ ] Add configurable matter visibility, private matters, team groups, and permission-aware sharing.
- [ ] Add granular controls for evidence, reports, client portal content, billing, exports, templates, and integrations.
- [ ] Add reusable firm templates with versioning, merge fields, approval status, client-visible/internal-only flags, and practice-area defaults.
- [ ] Add retention schedules, legal holds, export requests, deletion review, and an administrator activity view.
- [ ] Add security settings for active sessions, password/reset events, MFA readiness, and integration revocation.

### Acceptance gate

Two test users with different roles see and can perform only the actions allowed by the database-backed policy. A firm administrator can change defaults once and see them applied to new matters, appointments, documents, and portal requests. Personal settings remain separate from shared firm settings.

## Phase 3 — calendar integrations and scheduling operations

The in-app calendar is the source of truth for MatterPilot. External calendars should make conflicts visible and mirror approved appointments without silently changing matter data.

### Build

- [ ] Register Google and Microsoft OAuth applications for the production domain.
- [ ] Add production callback URLs, encrypted client credentials, provider scopes, and redirect validation.
- [ ] Complete live Google authorization and Outlook authorization with a real test account.
- [ ] Finish one-way push synchronization with token refresh, retry/backoff, idempotency keys, update/delete/cancel semantics, and sync-status visibility.
- [ ] Add provider error states for revoked access, expired credentials, unavailable calendars, and rate limits.
- [ ] Record the external event ID, provider, last sync time, sync result, and source of truth for every synchronized appointment.
- [ ] Add explicit conflict policy: external busy events block availability, but external edits do not overwrite protected MatterPilot fields without user action.
- [ ] Add optional inbound sync only after the one-way flow is reliable and the conflict policy is documented.
- [ ] Add firm-wide calendar views with pagination and indexes so the calendar does not depend on loading an unbounded matter list.
- [ ] Add time-zone and daylight-saving test coverage across booking, recurring appointments, reminders, and external sync.

### Acceptance gate

An authorized user can connect Google or Outlook, select a calendar, create/update/cancel an appointment in MatterPilot, and see the expected external event exactly once. Revoking the provider, retrying a failed delivery, and moving an appointment across a daylight-saving boundary all produce safe, explainable results.

## Phase 4 — documents, templates, and client experience

This phase makes the existing portal and preparation workflow reusable across real firms and practice areas.

### Build

- [x] Keep private matter-scoped storage, signed downloads, validation, hashes, replacement, and retention controls.
- [x] Keep document versions, typed-name signature attestations, approval states, and client-visible/internal-only permissions.
- [ ] Build the firm template editor for intake questionnaires, engagement letters, preparation packets, notices, and recurring document requests.
- [ ] Support template versions, draft/published status, merge-field validation, preview with sample matter data, and rollback.
- [ ] Add practice-area and matter-type template packs without hard-coding every new workflow.
- [ ] Add portal branding, firm contact instructions, secure notification preferences, and a better client onboarding flow.
- [ ] Add document request statuses, reminders, assignees, due dates, required/optional labels, and review outcomes.
- [ ] Add export bundles for a matter, including a manifest, metadata, documents, report versions, and activity history.
- [ ] Add administrator controls for retention, legal hold, download restrictions, and portal access expiration.

### Acceptance gate

An administrator can publish a template, a staff member can generate it for a new matter with validated fields, an attorney can approve it, and a client can see only the intended version. A complete matter export can be opened outside the application and audited.

## Phase 5 — billing and financial operations

Billing should be added after firm identity, roles, permissions, and operational audit are stable.

### Build

- [x] Keep time-entry and draft-billing foundations.
- [ ] Choose the billing model: subscription/seat billing for MatterPilot, firm invoices, client payment collection, or a staged combination.
- [ ] Register the payment provider and configure test and production webhook secrets.
- [ ] Add firm plan, seat, usage, trial, subscription, invoice, and payment-status models.
- [ ] Add administrator-only billing access and a clear separation between firm billing and client matter data.
- [ ] Add time-entry review, rates, write-downs, invoice drafts, invoice approval, and invoice history.
- [ ] Add payment collection only after legal, tax, refund, and trust-account requirements are explicitly defined.
- [ ] Add webhook idempotency, reconciliation, failed-payment handling, refunds, and audit events.
- [ ] Add exportable billing records and an operations view for outstanding work.

### Acceptance gate

A test firm can subscribe, add/remove a seat, create an invoice from approved time, receive a provider webhook, and reconcile the resulting state without exposing payment secrets or allowing a non-admin to change billing.

## Phase 6 — TraceLine intelligence and deeper AI assistance

AI remains assistive and reviewable. It may organize, summarize, compare, and suggest; it must not silently decide facts, credibility, legal conclusions, or client-facing outcomes.

### Build

- [x] Keep optional AI-assisted analysis drafts behind a human-review workflow.
- [x] Keep matter-brief assistance with redaction, prompt-version, model, and human-review tracking.
- [ ] Add evidence-cited summaries where every material claim links to source evidence and a locator.
- [ ] Add suggested contradiction detection using statements, dates, subjects, and linked evidence, with neutral language and attorney confirmation.
- [ ] Add timeline-gap and late-created-record suggestions with an explicit “needs review” state.
- [ ] Add missing-document suggestions based on matter type, configured checklist, and existing evidence—not unsupported assumptions.
- [ ] Add deposition-question and interview-preparation drafts that cite the underlying propositions or evidence.
- [ ] Add prompt/version registry, model allowlist, redaction policy, provider selection, retention policy, and per-firm AI settings.
- [ ] Add cost budgets, token usage, rate limits, job cancellation, and usage reporting.
- [ ] Add AI run audit records with actor, model, prompt version, input scope, output status, citations, reviewer, and approval timestamp.
- [ ] Add evaluation fixtures and regression tests for citation accuracy, matter isolation, redaction, unsupported claims, and refusal behavior.

### Acceptance gate

Every generated output is clearly labeled as a draft, stays inside the matter boundary, cites its evidence when making factual claims, records the model and prompt version, supports human edits/rejection, and cannot become client-visible without explicit approval.

## Phase 7 — scale, polish, and operating maturity

This phase hardens the product for more firms, more matters, and more data.

### Build

- [ ] Add query plans, indexes, pagination, bounded list endpoints, and loading-state performance budgets for large firms.
- [ ] Move long-running document generation, AI runs, exports, sync, and notification work to durable background jobs with visible progress.
- [ ] Add rate limiting and abuse protection for public booking, portal links, auth, uploads, and AI endpoints.
- [ ] Complete accessibility review for keyboard navigation, focus management, labels, contrast, dialogs, tables, and calendar interactions.
- [ ] Complete mobile/tablet review for calendar, settings, portal, reports, and evidence screens.
- [ ] Add end-to-end browser smoke coverage for staff, client, public booking, denied access, expired links, and provider failure states.
- [ ] Add migration checks, CI typecheck/lint/build/test gates, preview-environment data safety, and production deployment checks.
- [ ] Establish incident ownership, support diagnostics, status communication, data-subject/export procedures, and release notes.

### Acceptance gate

The application remains responsive with representative firm data, long-running work is recoverable, public endpoints are rate-limited, the critical user journeys are covered by automated checks, and the team has a documented support and incident process.

# Recommended execution order

The next slices should be delivered in this order:

1. **Production contract and email delivery** — finish domain/auth configuration, provider setup, monitoring, smoke checks, and real transactional messages.
2. **Firm administration** — turn the settings foundation into persisted workspace settings, team administration, database-enforced permissions, templates, and retention/export controls.
3. **Calendar integrations** — complete Google/Outlook registration, callbacks, encrypted credentials, one-way sync reliability, and live end-to-end verification.
4. **Template and portal completion** — make the preparation workflow configurable and reusable for multiple practice areas.
5. **Billing operations** — choose the provider and business model, then implement subscriptions, seats, invoices, and reconciliation.
6. **TraceLine AI expansion** — add citations, contradiction/gap suggestions, deposition assistance, governance, budgets, and evaluations.
7. **Scale and operating maturity** — optimize, rate-limit, automate regression coverage, and formalize support and incident operations.

# Definition of fully operational

MatterPilot / TraceLine is ready for real firm use when all of the following are true:

- [ ] Production domain, Supabase auth redirects, Vercel environment variables, and deployment protection are intentionally configured.
- [ ] Health checks, error monitoring, structured logs, smoke tests, rollback instructions, and backup/restore verification are active.
- [ ] Transactional email is delivered by a verified provider with retries, webhooks, delivery history, and preference controls.
- [ ] Personal and firm settings persist correctly, and roles/permissions are enforced in the database and tested across staff roles.
- [ ] Google and/or Outlook sync has been authorized with a real account and verified through create, update, cancel, retry, revoke, and time-zone scenarios.
- [ ] Templates, client-visible approvals, portal access, storage, exports, retention, and revocation behave as documented.
- [ ] All six reports generate correctly, remain matter-scoped, preserve citations where applicable, and have verified PDF/print output.
- [ ] Billing behavior is implemented only to the chosen scope, with provider webhooks, reconciliation, access controls, and audit history.
- [ ] AI features are optional, reviewable, cited where factual, redacted, budgeted, auditable, and tested for unsupported claims and cross-matter leakage.
- [ ] Empty, loading, error, denied, expired, provider-failure, mobile, and accessibility states are real and tested.
- [ ] No provider integration is described as live until a real production request or delivery has been verified.

# Quality bar for every slice

- Matter isolation and role boundaries remain enforced in the database.
- Client-visible content is explicitly approved before sharing.
- Migrations are applied and verified in the target environment before a feature is called complete.
- Typecheck, lint, build, security tests, and relevant browser walkthroughs pass.
- Empty, loading, error, denied, expired, and mobile states are real and tested.
- Secrets never enter the repository, client bundle, logs, screenshots, or generated reports.
- A feature is marked `[x]` only after its real external dependency works, not merely because its UI or route exists.
