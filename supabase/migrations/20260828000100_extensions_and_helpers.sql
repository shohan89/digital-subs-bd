-- Extensions and shared helper functions used by every table migration that follows.
--
-- `public.is_admin()` (used by every table's admin policy) is deliberately NOT defined here: it's
-- a LANGUAGE SQL function, and Postgres parse-analyzes a SQL-language function body — resolving
-- every table/column reference against the catalog — at CREATE FUNCTION time, not lazily at
-- first call the way LANGUAGE PLPGSQL does. Since its body queries `public.profiles`, it's
-- defined in `create_profiles.sql`, right after that table exists.

create extension if not exists pgcrypto;

-- Auto-maintains `updated_at` on any table that attaches this as a BEFORE UPDATE trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
