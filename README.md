# MatterPilot / TraceLine Defense Intelligence

MatterPilot is the legal-operations workspace for law firms. TraceLine is the defense-intelligence layer inside it: a structured, evidence-linked workspace that helps attorneys, investigators, paralegals, litigation-support professionals, and experts understand what the record can establish, challenge, authenticate, contextualize, or disprove.

Production domain: [matterpilot.app](https://matterpilot.app)

The product is deliberately human-led. It is not a people-search product, surveillance system, autonomous legal decision-maker, credibility scorer, legal-advice service, or substitute for investigation and attorney judgment.

## Current product shape

MatterPilot connects the firm’s operational work to the matter record:

```text
Intake → Conflict review → Matter → Appointment / readiness → Documents / portal
                                      ↓
Question → Subject → Lead → Source → Evidence →
Corroboration / contradiction → Analysis → Report
```

Every matter is isolated, every substantive report is derived from recorded matter data, and every report can be regenerated from the current record.

## Implemented features

### MatterPilot operations

- Matter command center with matter search, status filters, readiness indicators, recommended next actions, and matter-scoped navigation.
- Matter creation and role-aware membership for attorneys, investigators, paralegals, litigation support, experts, and other permitted team roles.
- Calendar views for week, month, and day navigation with real appointment ranges.
- Clickable calendar dates and time slots for appointments, internal notes, follow-ups, calls, consultations, court events, deadlines, and other common workflows.
- New-client scheduling before a matter exists, with the option to attach or create the matter later.
- Appointment workflow states, conflict checks, availability windows, time zones, blackout windows, overlap protection, staff rescheduling, and appointment movement history.
- Recurring appointment series and firm-wide appointment scheduling.
- Provider-ready Google Calendar and Outlook OAuth connections with explicit matter selection and one-way appointment push. External events contain only title, date/time, location, and workflow status; client names and private notes remain in MatterPilot. Provider credentials must be configured and a live provider authorization completed before this is active in production.
- Readiness pipeline that moves appointments from blocked or tentative states through preparation and ready-to-meet states.
- Preparation tasks with owners, dependencies, due dates, priority, completion states, and workload/team assignment views.
- Recurring task templates, notification queue, court-rule calculations, and scheduled operations for recurring tasks and notifications.
- Protected Vercel Cron operations route for automatic recurring-task materialization and queued notification processing.

### Intake, contacts, and client workflows

- Public booking pages for prospective clients.
- Intake review with duplicate-contact detection, cross-matter contact history, and conflict search across people and organizations.
- Intake acceptance that can create a matter and begin the engagement workflow.
- Matter contacts with archive/reactivate controls.
- Ready-made intake questionnaire, engagement letter, consultation preparation, and litigation preparation documents.
- Template-defined fillable fields, attorney draft/final review, typed-name signature attestations, immutable document versions, and client-visible versus internal-only controls.
- Secure, one-time, expiring, revocable preparation links.
- Client preparation packets with reminders, tracking, requested items, and firm review.

### Client portal

- Verified client access with support for multiple matters per client.
- Client matter updates, appointment details, task checklists, messages, document requests, uploads, and private document review.
- Portal activity history and access revocation controls.
- Private Supabase Storage for uploaded evidence and client documents with validation, SHA-256 hashes, signed downloads, replacement handling, retention controls, and legal-hold support.

### TraceLine defense intelligence

- Matter, question, proposition, subject, entity-attribute, lead, source, evidence, annotation, evidence-link, event, statement, contradiction, analysis, conclusion, report, review-decision, and audit-event records.
- Six core intelligence screens:
  - Matter Command Center
  - Question & Proposition Workspace
  - Subject & Entity Profiles
  - Evidence Ledger
  - Timeline
  - Contradiction & Adversarial Review
- Evidence provenance, source locators, authentication status, annotations, supporting/contradicting links, exclusion and restoration, supersession, and audit history.
- Timeline analysis for gaps, collisions, disputed dates, and late-created records.
- Neutral contradiction review with fixed adversarial questions, alternative explanations, missing evidence, and examination topics.
- Optional AI-assisted analysis drafts and matter-brief assistance through the human-review workflow. AI output is treated as a draft, never as a final legal conclusion.
- Analysis runs record redaction settings, prompt version, model, cited records, review status, and human-review metadata.

### Reports

All six report types are available as matter-scoped report views, browser-print reports, and branded PDF exports:

1. Proposition Evidence Matrix
2. Master Chronology
3. Investigative Memorandum
4. Witness Contradiction Report
5. Evidence / Source Index
6. Case-Theory Stress Test

The Reports area also keeps matter-scoped generation history with report type, output format, timestamp, file size, and a link to regenerate or reopen the report.

### Firm operations

- Matter activity and communication timelines.
- Draft time tracking and billing foundations.
- Communications outbox and appointment communications.
- Public health endpoint for deployment checks.
- Baseline security headers and protected application routes.
- GitHub `main` branch and Vercel production deployment workflow.

## Security and data boundaries

- Supabase Auth provides email/password authentication.
- Matter-level Row Level Security policies protect every matter-owned table.
- Composite matter-aware foreign keys prevent cross-matter references.
- Polymorphic references are checked by database triggers.
- Privileged functions derive actor identity from `auth.uid()` instead of trusting client-supplied identity.
- Audit events and review decisions are protected through controlled database functions; direct spoofing writes are revoked.
- Evidence exclusion is enforced by database-backed role restrictions, not only by UI controls.
- Client-visible content requires explicit approval through the preparation/document workflow.
- The security suite covers matter isolation, cross-matter reference attacks, direct writes, audit spoofing, client access, artifact lifecycle, role restrictions, and privileged-function attacks.

The application does not claim that a stored hash authenticates evidence, that an AI draft is legally correct, or that a calculated date is a binding court deadline. Those remain human-review responsibilities.

## Routes and entry points

| Route | Purpose |
| --- | --- |
| `/` | Public product landing page |
| `/auth/login` | Staff sign-in |
| `/auth/sign-up` | Staff account creation |
| `/matterpilot` | MatterPilot operations dashboard |
| `/matterpilot/intake` | Intake and conflict review workspace |
| `/matterpilot/operations` | Tasks, deadlines, readiness, and scheduled operations |
| `/matters` | Matter list and matter creation |
| `/matters/[matterId]` | Matter command center |
| `/matters/[matterId]/questions` | Questions and propositions |
| `/matters/[matterId]/subjects` | Subject and entity profiles |
| `/matters/[matterId]/evidence` | Evidence ledger and artifact management |
| `/matters/[matterId]/timeline` | Timeline and event analysis |
| `/matters/[matterId]/contradictions` | Contradiction and adversarial review |
| `/matters/[matterId]/analysis` | Analysis drafts and human review |
| `/matters/[matterId]/reports` | Report catalog and report history |
| `/book/[slug]` | Public booking page |
| `/portal` | Verified client portal |
| `/prepare/[token]` | Secure preparation packet link |
| `/api/health` | Non-secret deployment health check |
| `/api/matterpilot/cron/operations` | Protected scheduled operations endpoint |
| `/api/matters/[matterId]/reports/[reportType]/pdf` | Protected branded PDF generation endpoint |

## Technology stack

- Next.js 16 App Router and Server Actions
- React 19 and TypeScript
- Tailwind CSS v4 and shadcn/ui with Base UI primitives
- Supabase Postgres, Auth, Row Level Security, Storage, and database functions
- `pdf-lib` for branded server-generated PDFs
- Vercel production hosting and Vercel Cron
- Optional OpenAI provider through the Vercel AI SDK

## Local setup

Requirements: Node.js, npm, Supabase CLI, and access to the linked Supabase project for migrations/tests.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` from [.env.example](.env.example). The required runtime values are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for the seed script and live security tests
- `CRON_SECRET` for scheduled operations
- `NEXT_PUBLIC_SITE_URL` for OAuth callback URLs
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and optional `MICROSOFT_TENANT_ID` for calendar providers
- `CALENDAR_TOKEN_ENCRYPTION_KEY` for encrypting server-side OAuth tokens
- `OPENAI_API_KEY` and `OPENAI_MODEL` when optional AI workflows are enabled

Never commit `.env.local`, service-role keys, OpenAI keys, cron secrets, or any other secret value.

## Database and demo data

The database source of truth is [supabase/migrations](supabase/migrations). Apply migrations to the linked project with:

```bash
supabase db push --linked
```

The latest migration adds report PDF metadata and report history:

```text
supabase/migrations/20260924120000_report_exports_and_history.sql
```

For a non-production environment, seed one fully worked fictional matter:

```bash
npm run seed
```

The seed creates fictional demo accounts:

```text
demo.attorney@traceline.local
demo.investigator@traceline.local
demo.paralegal@traceline.local

Password: TraceLine-Demo-2026!
```

No real or sensitive personal data is used by the seed data.

## Verification

Run the complete local verification suite before merging or deploying:

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
npm audit --omit=dev
```

The security suite currently contains 86 tests and runs against the linked Supabase project when no isolated local Postgres instance is available. Browser walkthroughs should cover login, matter creation, scheduling, readiness, documents, client access, reports, empty states, denied states, and mobile/tablet layouts.

## Deployment and recovery save point

The canonical source is the GitHub `main` branch. Vercel is connected to the repository and the production aliases are:

- [https://matterpilot.app](https://matterpilot.app)
- [https://www.matterpilot.app](https://www.matterpilot.app)

Manual production deployment from the project root:

```bash
vercel --prod --yes
```

After deployment, verify:

```bash
curl -fsS https://matterpilot.app/api/health
vercel inspect <deployment-url>
```

Recovery procedure:

1. Clone the repository and check out `main`.
2. Install dependencies with `npm install`.
3. Recreate `.env.local` from `.env.example` using the deployment’s secret store.
4. Apply the migrations with `supabase db push --linked`.
5. Run the verification commands above.
6. Deploy with `vercel --prod --yes`.

This README, `ROADMAP.md`, the migration history, and the GitHub commit history are the project’s durable reference points. Database migrations are append-only; do not rewrite an applied migration to repair production state.

## Remaining roadmap

The current build is a strong working MVP, but these areas remain intentionally open:

- Google Calendar and Outlook synchronization.
- Production provider registration and live end-to-end verification for the calendar OAuth/sync slice.
- Production transactional email delivery for queued reminders and communications.
- Error monitoring, structured request logging, and automated deployment smoke checks.
- Firm settings, reusable firm templates, more granular roles, retention policies, and export controls.
- Payment and billing-provider integrations beyond draft time/billing foundations.
- Evidence-cited AI summaries, automated contradiction detection, timeline-gap detection, and missing-document suggestions.
- Deposition-question and preparation-draft assistance.
- Expanded AI prompt/version governance, redaction controls, cost controls, and model audit records.
- More granular per-field permissions and broader database-trigger audit coverage.

The ordered implementation plan, including completed slices, is maintained in [ROADMAP.md](ROADMAP.md).

## Product doctrine

MatterPilot should make the next responsible action obvious without hiding uncertainty. TraceLine should preserve the difference between a source’s statement, the team’s inference, a contradiction, and a conclusion. Every new feature must preserve matter isolation, explicit client-sharing approval, human review, reversible changes, and a clear audit trail.
