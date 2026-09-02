# Digital Subs BD — Final Production Readiness Checklist

**Verdict: ready for production deployment**, pending the manual pre-deployment steps in
[Before you deploy](#before-you-deploy) below (creating Cloudflare resources, setting real
secrets, replacing placeholder business data) — none of which are code changes.

This is the final audit in a series this project went through: a full [security
audit](./CLAUDE.md), a [Cloudflare deployment](./CLOUDFLARE_DEPLOYMENT.md) pass, an environment
variable strategy pass, a full live production-testing pass (every customer/admin flow, the
authorization boundary matrix, edge cases), and a UI/UX review. This document is the final
lead-engineer sign-off pass on top of all of that — it re-verifies the areas above are still
intact, and closes out what was still missing.

## What this final pass found and fixed

Two real gaps, both fixed and verified live; everything else below was re-verified, not
re-discovered.

1. **No test suite at all.** `package.json` had no `test` script and there wasn't a single test
   file anywhere in the repo. Added Vitest (`vitest.config.ts`, `npm test`) with 43 unit tests
   across 6 files, targeted specifically at the pure business-logic functions with the highest
   regression risk — the exact kind of logic that already caused one real, subtle bug this app
   shipped with (`utils/timezone.ts`'s calendar-day math; see that file's own doc comment). Covers:
   subscription status derivation (`utils/subscription.ts`), order status transition rules
   (`utils/order-status.ts`), coupon status derivation and discount clamping
   (`utils/coupon.ts`, `services/coupons.service.ts`'s `computeDiscount`), PostgREST filter
   escaping (`utils/postgrest.ts`), and the Bangladesh calendar-day math itself
   (`utils/timezone.ts`). Not a full test suite for the whole app (no component/integration tests)
   — deliberately scoped to pure functions with real business rules, not everything that could
   theoretically be tested.
2. **No security headers.** `next.config.ts` set no headers at all. Added `X-Frame-Options: DENY`,
   `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a
   restrictive `Permissions-Policy` — verified live via `curl -I` against a production build on
   both a static route (`/`) and dynamic routes (`/login`, `/admin/dashboard`) that all four
   headers actually reach the response. A strict `Content-Security-Policy` was deliberately **not**
   added — this app loads images from Supabase Storage and calls the Supabase REST API directly
   from the browser, and an incorrect CSP source list fails by silently breaking the site, not by
   being silently insecure. It needs its own dedicated pass with real page-by-page testing, not a
   guess folded into a sixteen-category audit. Tracked in [Recommended
   follow-ups](#recommended-not-blocking-follow-ups) below.

Also corrected two stale doc comments found in passing (`utils/format-currency.ts` described a ৳
symbol the code doesn't actually produce; a `next.config.ts` comment claimed a WhatsApp "widget
script" that doesn't exist — it's a plain link) — not production risks, but left-behind
inaccuracies worth not leaving for the next person to trust.

## Audit by category

### Architecture
Next.js 15 App Router, Server Components by default, thin Server Actions
(auth → Zod validate → service call → `revalidatePath`), a `services/*` layer that takes a
Supabase client as its first argument rather than constructing one. Fully documented in
[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — unchanged this pass, still accurate.
**Status: sound.**

### Database
32 migrations, reconciled against every service file (`products`/`categories`/`orders`/
`payments`/`subscriptions`/`reviews`/`coupons` — see PROJECT_STRUCTURE.md's "Known mismatch" list,
currently empty). Atomic multi-table writes (`approve_payment`/`reject_payment`, `redeem_coupon`)
are `plpgsql` functions, not sequential service-layer calls, specifically to close a real race
condition a prior implementation had. Every `returns table` function prefixes output columns
`out_*` to avoid the column-name-ambiguity bug that broke `approve_payment` once already.
**Status: sound, unchanged this pass.**

### RLS
Every operational table uses `is_staff()` (admin OR manager); `profiles`/`coupons`/
`coupon_usages`/`settings` deliberately stay `is_admin()`-only. `redeem_coupon()` and
`check_rate_limit()` have `execute` revoked from `authenticated, anon, public` — verified live in
the security audit that a direct `supabase.rpc()` call from an anonymous client now fails with
`permission denied (42501)`. **Status: sound, unchanged this pass** — no new RLS policies or
functions were added since the security audit.

### Authentication
Register/login/logout tested live end-to-end via Playwright against a production build.
Login/register/forgot-password are all rate-limited (by email and by IP) — confirmed genuinely
working, not just present in code, by actually exhausting the login rate limit during testing and
observing the real "Too many attempts" response. One real bug was found and fixed during that pass:
`AuthProvider`'s client-side session state didn't resync after a server-side sign-in/out (a
`redirect()` from a Server Action is a client-side transition, not a full page load, so the
browser Supabase client's `onAuthStateChange` never fired) — fixed by re-checking the session on
every route change. **Status: sound, fix verified live.**

### Authorization
The full customer/manager/admin boundary matrix was tested live: 23+ checks covering a customer
hitting every `/admin/*` route, a manager hitting admin-only pages (`/admin/coupons`,
`/admin/settings`, `/admin/customers`) vs. staff-level pages, all enforced correctly and
consistently at the middleware layer regardless of viewport. `requireUser`/`requireStaff`/
`requireAdmin` (server-side, the real gate) vs. `useAuth()` (client-side, UI state only) are kept
strictly separate per CLAUDE.md's own rule. **Status: sound, unchanged this pass.**

### Payments
Manual bKash/Nagad/Rocket "Send Money" + screenshot upload, verified end-to-end live: submission,
admin approval (atomic `approve_payment()`, provisions the subscription in the same transaction),
and — critically — duplicate submission with the same transaction ID was tested and correctly
rejected ("This transaction ID has already been submitted") via the `payments_transaction_id_key`
unique constraint. Screenshot upload validates type/size server-side inside
`uploadPaymentScreenshot` itself, not just at the caller — found and fixed as a real gap in the
security audit. **Status: sound, unchanged this pass.**

### Orders
Full lifecycle tested live: creation → payment submission → admin approval → status progression
(`pending` → `processing` → `completed`) → customer-visible status/notifications. Status
transitions are governed by `utils/order-status.ts`'s `isValidOrderStatusTransition` — now
unit-tested (6 cases covering forward-only movement, the paid-payment requirement for
processing/completed, and cancellation being available regardless of payment status).
**Status: sound, now with regression coverage.**

### Subscriptions
Provisioning (via `approve_payment()`), expiry display, and the admin "extend/set expiry" flow
were all tested live, including deliberately expiring a subscription and confirming it read
"Expired" identically on both the admin and customer dashboards. `getSubscriptionStatus` is now
unit-tested with a case specifically for the historical bug class (something that expired earlier
today, which a calendar-day-only check would misclassify as still active) — the doc comment on
`utils/timezone.ts` explains that bug in detail. **Status: sound, now with regression coverage for
the exact class of bug that hit this function once already.**

### Admin
Every admin page (products, categories, orders, payments, subscriptions, reviews, coupons,
customers, settings) was live-tested for CRUD operations, and every one now uses a shared
`EmptyState` component instead of ~20 slightly-inconsistent hand-rolled empty-state blocks (found
in the UI/UX review). Admin data tables scroll horizontally on mobile rather than reflowing to
cards — confirmed this doesn't cause page-level overflow and is a standard, acceptable pattern for
dense admin UIs; redesigning all 8 tables into responsive cards was assessed and deliberately not
done (out of proportion for an "improve" pass, and this app's admins are staff members, not the
customer-facing mobile audience). **Status: sound.**

### SEO
`buildMetadata`/`NOINDEX_ROBOTS`/JSON-LD/`robots.ts`/`sitemap.ts` — re-verified live this pass
(`curl /robots.txt` and `/sitemap.xml` against the current build) still return correct,
dynamically-generated output including real category data. Unchanged since the dedicated SEO pass.
**Status: sound.**

### Performance
Dynamic imports for charts, `cache()`-wrapped settings reads, batched notification dedup/insert,
`revalidate = 3600` on the homepage/`/categories`/`/category/[slug]`/sitemap — all unchanged and
still backed by the R2 + Durable Object caching stack (see Cloudflare compatibility below).
**Status: sound.**

### Security
Full audit already performed (RLS/auth/Server Actions/uploads/rate limiting — see CLAUDE.md's
"Security audit" section) plus this pass's addition of baseline HTTP security headers. Service-role
key confirmed never reachable from client-bundled code (enforced by `"server-only"` on
`env.server.ts`, verified live by writing a throwaway Client Component that imported it and
watching `next build` fail immediately). **Status: sound, hardened further this pass** (headers).
CSP is the one open item — see follow-ups.

### Accessibility
Found and fixed in the UI/UX review: `Reveal` (the scroll-in animation on every marketing section)
didn't respect `prefers-reduced-motion` at all. Now uses Framer Motion's `useReducedMotion()`.
Focus-visible states verified live via an actual keyboard tab-through of the homepage — every
interactive element gets either a proper focus ring (buttons, via the shared `Button` component)
or a visible browser-default outline (plain nav links). **Status: sound, real fix verified live.**

### Cloudflare compatibility
Re-verified this pass after the `next.config.ts` headers change: `opennextjs-cloudflare build`
succeeds, and `wrangler deploy --dry-run` resolves every binding (R2 bucket, 3 Durable Objects,
the self-reference service binding, the Images binding) with no errors. Full setup documented in
[CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md). **Status: sound.**

### Environment variables
`src/lib/env.ts` (client-safe) vs. `src/lib/env.server.ts` (`"server-only"`-guarded) split,
`.env.example` documents every variable's exposure level (Public/Server-only/Secret). No new
environment variables were introduced this pass. **Status: sound, unchanged this pass.**

### Error handling
Root, `(admin)`, and `(dashboard)` all have real `error.tsx` boundaries (not placeholders — each
renders an actual retry UI) plus a root `not-found.tsx`. Marketing sections individually catch
their own data-fetch failures and render an inline `Alert` rather than throwing up to the route's
error boundary (established pattern, see PROJECT_STRUCTURE.md). **Status: sound, unchanged this
pass** (verified the boundary files still exist and aren't stubs; didn't re-audit every try/catch
site given how extensively this was covered in the security audit and production testing pass).

### Mobile responsiveness
Every one of the 34 public/admin pages was screenshotted at mobile (390px), tablet (768px), and
desktop (1440px) in the UI/UX review with zero unexpected console errors across all 93 captures.
One real bug found and fixed there: admin dashboard stat cards ("Completed Orders", "Active
Subscriptions") were truncating to "Completed Ord…" at both the 6-column desktop and 2-column
mobile grid widths — fixed to wrap instead of truncate, verified fixed at both breakpoints.
**Status: sound, real fix verified live.**

## Final gates

All four run clean on the current code:

```
npm run lint        ✓ zero errors, zero warnings
npm run typecheck    ✓ zero errors
npm run test          ✓ 43/43 passing (6 files)
npm run build          ✓ 38/38 pages generated
```

## Before you deploy

None of these are code changes — they're the manual, one-time steps
[CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) already documents in full:

- [ ] Create the R2 bucket: `npx wrangler r2 bucket create digitalsubsbd-opennext-cache`.
- [ ] Set every runtime secret on Cloudflare (`wrangler secret put <NAME>`) — see
      CLOUDFLARE_DEPLOYMENT.md's "Environment variables" section for the full list and the
      build-time-vs-runtime distinction.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real production domain before building for production —
      it's both inlined into the client bundle and used server-side to build the password-reset
      link.
- [ ] Replace the placeholder bKash/Nagad/Rocket "Send Money" numbers in
      `src/constants/site.ts`'s `siteConfig.payment` with the real merchant/personal numbers.
- [ ] Set the real WhatsApp support number from `/admin/settings` (this one's DB-backed, not a
      code change or redeploy).
- [ ] Add the production domain to Supabase's Authentication → URL Configuration (Site URL +
      Redirect URLs) — a production password-reset email needs this or Supabase will refuse the
      redirect.
- [ ] If attaching a custom domain, do that and update `NEXT_PUBLIC_SITE_URL`/Supabase redirect
      URLs together, not separately (see CLOUDFLARE_DEPLOYMENT.md's "Custom domain" section).

## Recommended (not blocking) follow-ups

- **Content-Security-Policy.** Deliberately left out of this pass — see the "Security" section
  above for why. Worth a dedicated pass with real page-by-page verification before or shortly
  after launch, not a blocker to launching.
- **Real payment gateway integration.** Checkout is intentionally manual (transfer + screenshot +
  staff review) — documented as a deliberate choice, not a gap, in PROJECT_STRUCTURE.md's "What's
  deliberately not built yet." Fine to launch with; a real bKash/Nagad/SSLCommerz API integration
  is a genuine future feature, not a production-readiness issue.
- **Admin table mobile card layout.** Noted above — functional today via horizontal scroll, would
  be a real UX improvement but is a large enough change (8 tables) to warrant its own scoped pass
  rather than folding into this audit.
