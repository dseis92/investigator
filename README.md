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

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and (for seeding only) `SUPABASE_SERVICE_ROLE_KEY` — see `.env.local` locally, it's gitignored and never committed.

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

## Implemented (first vertical slice)

Create Matter → Add Question → Add Subject → Capture Evidence → Build Timeline → Link Proposition → Compare Contradiction → Export Cited Report, across all 6 core screens: Matter Command Center, Question & Proposition Workspace, Subject & Entity Profiles, Evidence Ledger, Timeline, Contradiction & Adversarial Review, plus a printable Proposition Evidence Matrix report.

## Deferred

AI-generated analysis (data model is ready; v1 is human-authored only), the other 5 report types (visible as "Planned"), real file/blob upload of evidence artifacts, granular per-field permissions beyond the 6 matter-member roles, and DB-trigger-enforced audit logging.
