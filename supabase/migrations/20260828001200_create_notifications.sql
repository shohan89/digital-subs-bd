-- No `type`/`link` in this revision's field list — just title/message/read.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notifications_user_id_read_idx on public.notifications (user_id, read);
create index notifications_created_at_idx on public.notifications (created_at desc);

create trigger set_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;

create policy "Notifications: view own"
  on public.notifications for select
  using (user_id = auth.uid());

-- Covers "mark as read". Note this permits updating any column on your own row, not just
-- `read` — Postgres RLS is row-level, not column-level; a column-scoped version needs explicit
-- column GRANTs layered on top. Fine for now since nothing else is user-editable here.
create policy "Notifications: update own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No customer INSERT: notifications are system/admin-generated, not self-authored.
create policy "Notifications: admin full access"
  on public.notifications for all
  using (public.is_admin())
  with check (public.is_admin());
