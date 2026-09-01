-- Fixes from a full security audit of the app.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. `redeem_coupon()` was invoker-rights with no internal authorization check, and — like every
-- Postgres function — is auto-exposed as a callable RPC via PostgREST to any authenticated (or
-- even anonymous) client by default. It's only ever meant to be called from
-- `checkoutService.placeOrder`, which always runs on the service-role client — there is no
-- legitimate `authenticated`-role caller for it at all (unlike `approve_payment`/`reject_payment`,
-- which a real staff session *does* need to call directly, and which are correctly protected by
-- `payments`' own RLS `WITH CHECK` clause instead — revoking those would break the legitimate
-- staff flow, so they're deliberately left alone here).
--
-- Without this revoke, a signed-in customer could call `supabase.rpc("redeem_coupon", {...})`
-- directly with an arbitrary `p_order_id` (even one they don't own) and an arbitrary
-- `p_discount_amount`, incrementing `coupons.used_count` and inserting a bogus `coupon_usages` row
-- unrelated to a real order — a coupon/business-logic integrity issue, not a data-read IDOR, but a
-- real unauthorized write. `service_role` bypasses `revoke`/RLS entirely, so the actual checkout
-- flow is unaffected.
-- Both `from authenticated, anon` *and* `from public` are needed — Postgres grants `execute` on a
-- new function to the `PUBLIC` pseudo-role at creation time by default, and every real role
-- (including `authenticated`/`anon`) implicitly has whatever's granted to `PUBLIC` *in addition to*
-- its own specific grants. Revoking only from `authenticated`/`anon` directly (verified live: this
-- was tried first and confirmed insufficient — `information_schema.role_routine_grants` still
-- showed `PUBLIC` retaining `EXECUTE` afterward, which every role inherits regardless of its own
-- revoked grant) leaves the function fully callable via the `PUBLIC` grant alone. Revoke both.
revoke execute on function public.redeem_coupon(uuid, uuid, uuid, numeric) from authenticated, anon, public;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Rate limiting — there was none anywhere in the app. This backs `src/lib/rate-limit.ts`,
-- applied to the highest-abuse-risk Server Actions (login, register, forgot-password, order
-- tracking, coupon validation, checkout, review submission — see that file's own doc comment for
-- the full list and reasoning). A Postgres table, not an in-memory counter, specifically because
-- this app deploys to Cloudflare via OpenNext — a serverless/edge runtime gives no guarantee that
-- two requests hit the same instance/process, so in-memory state would silently under-count.
--
-- One row per `(bucket_key)` — not one row per hit — with `count`/`window_start` reset once the
-- window elapses. `check_rate_limit()` does the read-check-increment as a single atomic
-- `insert ... on conflict do update`, which takes a row-level lock for the duration of the
-- statement, closing the classic non-atomic "check, then increment" race a naive
-- select-then-insert implementation would have under concurrent requests.
create table public.rate_limits (
  bucket_key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

-- RLS enabled with **no policies at all** — every access to this table goes through
-- `check_rate_limit()` on the service-role client (see `src/lib/rate-limit.ts`); there's no
-- session to scope a policy to anyway, since rate limiting has to work for unauthenticated actions
-- (login, order tracking) too. Matches this app's existing pattern for service-role-only tables
-- with no legitimate direct client access (`settings`, `coupons`, `coupon_usages`).
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
as $$
declare
  v_row public.rate_limits;
begin
  insert into public.rate_limits (bucket_key, count, window_start)
  values (p_bucket_key, 1, now())
  on conflict (bucket_key) do update
    set
      count = case
        when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1
        else public.rate_limits.count + 1
      end,
      window_start = case
        when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now()
        else public.rate_limits.window_start
      end
  returning * into v_row;

  return v_row.count <= p_limit;
end;
$$;

-- Revoked from `authenticated, anon, public` explicitly, same reasoning (and same fix for the same
-- easy-to-miss Postgres default) as `redeem_coupon` above — `src/lib/rate-limit.ts` always calls
-- this via `createAdminClient()` (service-role bypasses grants/RLS entirely), the same
-- "service-role-only, no legitimate direct client access" posture as
-- `settings`/`coupons`/`coupon_usages`. Rate limiting has to work for unauthenticated actions too
-- (login, order tracking), which is exactly why it can't be gated behind a customer's own session
-- client the way most of this app's writes are — there's often no session to use. Letting any
-- authenticated/anonymous caller invoke this directly would also let them reset or pad their own
-- rate-limit counters, defeating the point.
revoke execute on function public.check_rate_limit(text, integer, integer) from authenticated, anon, public;
