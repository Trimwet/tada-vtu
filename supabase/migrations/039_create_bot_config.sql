-- bot_config: single-row table that controls the WhatsApp bot mode.
-- mode = 'ai'   → messages are handled by the Eve AI agent (default)
-- mode = 'menu' → messages are handled by the USSD-style numbered menu

create table if not exists bot_config (
  id text primary key default 'default',
  mode text not null default 'ai' check (mode in ('ai', 'menu')),
  updated_at timestamptz not null default now()
);

-- Seed the single row
insert into bot_config (id, mode)
values ('default', 'ai')
on conflict (id) do nothing;

-- Only service role can read/write (it's an internal config, not user-facing)
alter table bot_config enable row level security;

create policy "service role only" on bot_config
  using (auth.role() = 'service_role');
