-- 037_create_baileys_sessions.sql
-- Stores Baileys WhatsApp session data (creds + signal keys) as a single JSONB blob.
-- Replaces file-based useMultiFileAuthState, enabling the bot to run on stateless
-- hosts like Render free tier where the filesystem is ephemeral.

create table if not exists public.baileys_sessions (
  id          text        primary key,
  data        jsonb       not null default '{}',
  updated_at  timestamptz not null default now()
);

-- Only the service role key accesses this table — no end-user access needed.
alter table public.baileys_sessions enable row level security;

-- Service role bypasses RLS automatically; no additional policies required.
-- Block all other roles from touching this table.
create policy "deny_all_user_access" on public.baileys_sessions
  as restrictive
  for all
  to authenticated, anon
  using (false);

comment on table public.baileys_sessions is
  'Stores Baileys WhatsApp session blobs (creds + signal keys) for stateless bot deployment. One row per bot instance (id = ''default'').';
