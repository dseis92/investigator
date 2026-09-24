-- MatterPilot: calendar OAuth state and server-only token storage.
-- Access and refresh tokens are encrypted by the application before storage.

alter table public.calendar_sync_connections
  add column if not exists oauth_state_hash text,
  add column if not exists scope text,
  add column if not exists calendar_name text;

create table public.calendar_sync_secrets (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique references public.calendar_sync_connections(id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  access_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_sync_secrets enable row level security;

-- Intentionally no authenticated/anon policies: only the server service role
-- may read or write encrypted provider credentials.
revoke all on public.calendar_sync_secrets from anon, authenticated;

create index calendar_sync_connections_state_idx
  on public.calendar_sync_connections(provider, user_id, status)
  where status = 'pending';
