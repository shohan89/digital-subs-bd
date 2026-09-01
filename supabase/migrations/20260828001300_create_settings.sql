-- Site-wide key/value config (e.g. maintenance mode, feature flags). Admin-only: if a future
-- feature needs one setting exposed publicly (a maintenance banner, say), that's better served by
-- a narrowly-scoped public policy or RPC over specific keys, not a blanket public read of this
-- whole table — deferred until that's actually needed.

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;

create policy "Settings: admin full access"
  on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());
