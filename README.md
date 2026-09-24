# TraceLine Defense Intelligence

An evidence intelligence and litigation investigation workspace for criminal-defense and civil-tort defense teams. TraceLine helps attorneys, investigators, paralegals, litigation support professionals, and experts determine what can actually be established, challenged, authenticated, contextualized, or disproved from lawful sources and authorized case evidence.

It is not a people-search product, a surveillance system, an autonomous legal decision-maker, a credibility scorer, or a substitute for human investigation and legal judgment.

Every investigation follows a reversible, traceable chain: **Matter → Question → Subject → Lead → Source → Evidence → Corroboration/Contradiction → Analysis → Conclusion → Report**. Every substantive conclusion must trace back to the exact evidence and source locator that supports it.

## Stack

Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind v4, shadcn/ui (`base-nova` style, `@base-ui/react` primitives), Supabase (Postgres, Auth, Row Level Security).

## Getting started

```bash
npm install
npm run dev
```

Requires `.env.local` with the variables listed in [.env.example](.env.example). The browser uses the Supabase URL and publishable key; the service-role key is server-only and used by the seed script and live security tests. OpenAI variables enable assisted analysis and are optional until that workflow is enabled.

Schema lives in `supabase/migrations`. Push it to the linked Supabase project with:

```bash
supabase db push --linked
```

Seed one fully worked fictional demo matter ("State v. Marcus Whitfield") with:

```bash
npm run seed
```

This creates three fictional demo accounts (`demo.attorney@traceline.local`, `demo.investigator@traceline.local`, `demo.paralegal@traceline.local`), password `TraceLine-Demo-2026!`. No real or sensitive personal data is used anywhere in the seed data.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

The deployment health check is available at `/api/health`. It reports only whether required integrations are configured; it never returns secret values.

The ordered product plan is tracked in [ROADMAP.md](ROADMAP.md).

## Implemented (first vertical slice)

Create Matter → Add Question → Add Subject → Capture Evidence → Build Timeline → Link Proposition → Compare Contradiction → Export Cited Report, across all 6 core screens: Matter Command Center, Question & Proposition Workspace, Subject & Entity Profiles, Evidence Ledger, Timeline, Contradiction & Adversarial Review, plus a printable Proposition Evidence Matrix report.

## Deferred

The remaining report types (visible as "Planned"), Google/Outlook calendar OAuth synchronization, transactional email delivery, granular per-field permissions beyond the matter-member roles, DB-trigger-enforced audit logging, and workload/team assignment views remain future work. AI-assisted analysis is implemented as an optional, human-reviewed draft workflow and requires `OPENAI_API_KEY` to be enabled.
