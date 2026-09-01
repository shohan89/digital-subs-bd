-- One row per auth.users row. `src/lib/auth/session.ts#getCurrentUser` reads this table for
-- role/full_name/phone/avatar — it already assumes this shape (it reads `avatar_url`, the
-- previous name for the `avatar` column below — another entry for the "Known mismatch" list in
-- PROJECT_STRUCTURE.md).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Creates the profile row automatically when someone signs up (see
-- `authService.signUpWithPassword`, which passes full_name/phone as auth user metadata).
-- SECURITY DEFINER: this must be able to insert into `public.profiles` regardless of the
-- new user's own (nonexistent, at this point) RLS grants.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Is the calling user an admin? Used by every table's admin policy from here on. SECURITY
-- DEFINER so it can read `profiles` regardless of the caller's own RLS grants — without this,
-- this table's own admin policy (querying `profiles` to check the caller's role) would recurse
-- into itself. `search_path` is pinned to prevent a search-path hijack from redirecting this to a
-- hostile `profiles` table. Defined here, not in `extensions_and_helpers.sql`: it's LANGUAGE SQL,
-- and Postgres resolves every table/column reference in a SQL-language function body against the
-- catalog at CREATE FUNCTION time, so it can't be defined before `profiles` exists.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

-- Customer: can view own profile (explicitly required). Deliberately no customer UPDATE policy
-- yet — an update policy would need to block customers from setting their own `role`, and that's
-- not needed by any code built so far; add it deliberately when a "edit profile" feature exists.
create policy "Profiles: view own"
  on public.profiles for select
  using (id = auth.uid());

-- Admin: full access (explicitly required).
create policy "Profiles: admin full access"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());
