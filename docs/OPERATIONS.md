# MatterPilot production operations

This is the first-phase operating checklist for the deployed MatterPilot application. It intentionally separates repository checks from dashboard actions that require the project owner’s provider accounts.

## Release gate

Run these checks from the repository before pushing a production release:

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

After deployment, run the public-boundary smoke checks:

```bash
SMOKE_BASE_URL=https://matterpilot.app npm run smoke:production
```

The smoke command checks the health endpoint, sign-in page, public booking page, protected staff routes, and unauthenticated cron protection. It reports status codes only and never prints response bodies or secrets.

## Vercel production configuration

Confirm these values are configured for the Vercel **Production** environment, with secrets stored as sensitive values:

- `NEXT_PUBLIC_SITE_URL=https://matterpilot.app`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `OPENAI_API_KEY` and `OPENAI_MODEL` if assisted analysis is enabled
- Google/Outlook OAuth values and `CALENDAR_TOKEN_ENCRYPTION_KEY` if calendar sync is enabled
- Transactional email provider credentials once a provider is selected

Do not copy production secrets into `.env.example`, the repository, client-side code, screenshots, or logs. Preview and Development values should be scoped separately where possible.

## Supabase authentication configuration

In Supabase Authentication → URL Configuration:

- Set the Site URL to `https://matterpilot.app`.
- Allow `https://matterpilot.app/auth/confirm`.
- Keep `http://localhost:3000/auth/confirm` for local development only.
- Add preview callback URLs only when a preview needs to be tested, and remove temporary URLs afterward.

For calendar providers, register these production callback URLs only with the provider whose integration is enabled:

- `https://matterpilot.app/api/matterpilot/calendar/google/callback`
- `https://matterpilot.app/api/matterpilot/calendar/outlook/callback`

## Deployment protection decision

Vercel Deployment Protection can remain enabled for previews. The public production domain must be reachable by unauthenticated clients for `/book/[slug]`, client preparation links, and health checks. If protection blocks those routes, either configure a narrowly scoped bypass or disable protection for the production domain after confirming the application’s own authorization boundaries.

## Monitoring and incident response

Before inviting real firms, connect one error-monitoring provider and verify a test error appears with:

- deployment/environment and release identifier;
- route and request ID;
- safe user context, without tokens, document contents, or client secrets;
- a link to the relevant Vercel request logs.

When an incident occurs:

1. Confirm whether the failure is application, Supabase, Vercel, email, calendar provider, or AI provider related.
2. Check the health endpoint and the smoke command.
3. Pause scheduled operations if they could repeat a failing side effect.
4. Inspect the latest deployment and logs without copying secrets into tickets.
5. Roll back only after confirming the target deployment and database migration compatibility.
6. Record the cause, affected routes, customer impact, recovery, and follow-up test.

## Rollback rule

Application rollback and database rollback are separate decisions. Never roll back a deployment blindly across a migration boundary. Prefer a forward-compatible fix; if a rollback is necessary, verify the target deployment, migration state, cron behavior, and provider callbacks first.

## Phase-0 completion evidence

Mark the roadmap’s production-readiness items complete only when:

- the production domain and auth redirects work from a clean browser;
- `npm run smoke:production` passes against the production URL;
- monitoring receives a safe test error;
- a deployment can be identified and rolled back safely;
- backup/restore and migration recovery have been exercised;
- transactional email delivery is verified separately through the communications acceptance gate.
