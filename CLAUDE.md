@AGENTS.md

# Digital Subs BD

Full architecture reference: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).
Read it before adding a new top-level folder, a new Supabase client, or a new
Server Action pattern — it documents the conventions those already follow.

Quick rules for this repo specifically:

- Server Components by default; add `"use client"` only for local interactive
  state, browser APIs, or a client-only library.
- Pages (`src/app/**`) call `services/*` for reads and `actions/*` for
  writes — no business logic in `app/`.
- Server Actions (`src/actions/*`) are thin: auth check → Zod-validate
  against a `src/features/<domain>/schemas.ts` schema → call a
  `src/services/*` function → `revalidatePath`.
- Service functions (`src/services/*`) take a Supabase client as their first
  argument (`DbClient`) instead of creating one — never call
  `createServerSupabaseClient`/`createClient`/`createAdminClient` from inside
  a service.
- Never import `src/lib/supabase/admin.ts` (service-role, bypasses RLS) from
  a Client Component or anything reachable from one.
- `src/types/database.types.ts` is a placeholder until `supabase gen types`
  runs against a real schema — don't widen it into a fake-safe
  `Record<string, any>`; see the comment in that file for why.
- Style with the semantic Tailwind tokens (`bg-primary`, `bg-secondary`,
  `bg-background`, `text-accent`, ...), never the raw `bg-brand-*` tokens —
  semantic tokens adapt across light/dark, brand tokens don't. `primary`/
  `accent` always pair with a **dark** foreground (`#020617`), not white —
  see the Design system section of PROJECT_STRUCTURE.md for the contrast
  math.
- New Framer Motion animations should reuse `src/lib/motion.ts`'s
  variants/transitions instead of inlining a new `transition={{ ... }}`.
- "Toast" is Sonner (`components/ui/toast.ts`), not a Radix Toast; "Modal"
  is a convenience wrapper around `Dialog` (`components/ui/modal.tsx`) —
  don't install/build separate primitives for either.
- `useAuth()` (client, UI state only) vs `requireUser`/`requireStaff`/
  `requireAdmin` (server, the actual access gate) are not interchangeable —
  never gate a route or an action on `useAuth()`'s `user` being non-null,
  and never use `requireStaff()` (admin OR manager) where `requireAdmin()`
  (admin only) is actually needed — role management
  (`updateUserRoleAction`) and site config (`/admin/coupons`,
  `/admin/settings`) must stay `requireAdmin()`-only; using `requireStaff()`
  there would let a manager grant themselves admin. See "Admin
  authorization" in PROJECT_STRUCTURE.md.
- `products.service.ts`/`categories.service.ts`/`orders.service.ts`/
  `payments.service.ts`/`subscriptions.service.ts`/`reviews.service.ts`/
  `coupons.service.ts` are all reconciled with `supabase/migrations/*.sql`
  now. See the "Known mismatch" list in PROJECT_STRUCTURE.md's Database
  schema section before assuming any given service file is current. Don't
  "fix" one side without checking the other.
- Operational tables' RLS "full access" policies use `is_staff()` (admin OR
  manager), not `is_admin()` — `categories`/`products`/`product_variants`/
  `orders`/`order_items`/`payments`/`subscriptions`/`reviews`. `profiles`/
  `coupons`/`coupon_usages`/`settings` deliberately still use `is_admin()`
  alone (role management, site config, and revenue-impacting coupon data
  are admin-only). If a new table gets an
  "admin full access"-style policy, decide deliberately which one it needs
  — don't default to copying whichever one the nearest existing table
  happens to use.
- `notificationsService.createNotification` does a plain `.insert()`, not
  `.insert().select()` — a staff caller (e.g. `moderateReviewAction`
  notifying the reviewer, not themselves) only has an INSERT policy on
  `notifications`, not a matching SELECT one, so chaining `.select()` makes
  PostgREST's implicit select-back fail RLS and roll back the whole insert.
  This was a real bug (silently swallowed by the caller's own try/catch, so
  the payment/review action itself still "succeeded" with no visible
  error) caught only by checking the database after a manager performed the
  action, not by the page loading fine. Don't re-add `.select()` unless a
  caller actually needs the returned row *and* you've also added a matching
  read policy.
- Any new `language sql` (not `plpgsql`) Postgres function in a migration
  must be defined *after* every table it queries — Postgres resolves a SQL
  function body's table/column references at `CREATE FUNCTION` time, not
  lazily. `plpgsql` functions don't have this constraint.
- This shadcn preset has no `Form`/`FormField` — use `components/ui/field.tsx`
  (`Field`/`FieldLabel`/`FieldError`) wired directly to React Hook Form's
  `register()`/`formState.errors`, not a Context-based form primitive. See
  `src/features/auth/components/*-form.tsx` for the pattern (RHF validates
  client-side; `onSubmit` calls the Server Action directly inside
  `useTransition` and maps a non-success `ActionResult` back onto the form
  with `setError()`, rather than using `<form action={...}>`).
- The post-login landing page depends on `profiles.role` — admins go to
  `/admin/dashboard`, everyone else to `/dashboard` (`loginAction` in
  `src/actions/auth.actions.ts`). `/admin` itself is just a redirect to
  `/admin/dashboard`; put admin landing-page content in the latter.
- New homepage/marketing sections: wrap the section's own Framer Motion in
  `components/shared/reveal.tsx`'s `<Reveal>`, not a new `motion.div` — it
  keeps the section itself a Server Component. If the section fetches data,
  wrap the service call in `try/catch` and render an inline `Alert` on
  failure (see `components/marketing/{categories-section,featured-products,
  testimonials}.tsx`, and `(marketing)/products/[slug]/page.tsx` for the
  same pattern on a whole page, not just a section) — don't let it throw up
  to the route's `error.tsx`. Empirically, an uncaught throw in this app's
  route tree does NOT reliably render `error.tsx` the way you'd expect (it
  can render `not-found.tsx`'s content instead, verified via a real
  production build, not just dev mode's overlay) — catching locally isn't
  just a style preference here, it's the only way to get the right UI.
- The cart (`useCart()`/`CartProvider`) is real but `localStorage`-only —
  there's still no `cart`/`cart_items` table, and that's fine: `/checkout`
  reads the client cart directly and writes the real order in one shot
  (`checkoutService.placeOrder`), so a server-side cart was never actually a
  prerequisite for checkout. "Checkout" (`CartSummary`) goes to `/checkout`
  now; "Buy Now" (`ProductPurchasePanel`) still hands off to a WhatsApp
  message — that one's still deliberately not wired to real order-creation
  (it bypasses the cart's variant/quantity selection state), same as every
  other "not built yet" item here.
- Checkout order-creation (`checkoutService.placeOrder`) runs on the
  service-role client, not the caller's session-scoped one — this is
  deliberate, not a shortcut: customers have no DELETE policy on `orders`
  (it's a financial record), so a failure partway through a multi-table
  write (order → order_items → payment) can't be rolled back through RLS.
  `userId` still only ever comes from `requireUser()` in the action, never
  from client input. Don't "fix" this to use `createServerSupabaseClient()`
  without also solving the rollback problem some other way.
- Payment-verification admin actions (`approvePaymentAction`/
  `rejectPaymentAction`) run on the admin's own session-scoped client, NOT
  service-role — `payments`/`orders`/`subscriptions` grant `is_staff()`
  full access and `notifications` grants `is_admin()` full access, so
  either way an authenticated staff session can write all of them directly;
  unlike checkout there's no rollback problem forcing service-role here.
  The one exception is `getPaymentScreenshotUrlAction`: the
  `payment-screenshots` bucket has NO Storage RLS policies at all (by
  design — only ever touched by service-role code), so viewing a
  screenshot specifically needs `createAdminClient()`. Mixing this up was
  a real bug caught in testing, not hypothetical — default to whichever
  client the *other* functions in the same file use, and only reach for
  the other one with a specific reason (a Storage call, or a rollback that
  needs to bypass RLS).
- `approvePayment`/`rejectPayment` (`payment-verification.service.ts`) are
  thin `.rpc()` wrappers around `approve_payment`/`reject_payment`, two
  `plpgsql` Postgres functions
  (`supabase/migrations/20260831000200_add_payment_verification_functions.sql`)
  — the whole multi-table write (claim the payment, provision
  subscriptions, update order status, log `order_activity`, notify) runs
  as one Postgres transaction, and duplicate-approval is prevented by a
  conditional `update ... where status = 'pending'` as the function's
  *first* statement, not a separate check. Don't move any of this logic
  back into sequential JS/PostgREST calls in the service layer — that's
  the exact shape of the previous implementation's race condition (a
  losing concurrent caller could create subscriptions before its own
  conditional update failed). Any new admin action needing multi-table
  atomicity should follow the same pattern: a `plpgsql` function, not
  service-layer sequencing.
- Any Postgres function using `returns table (...)` must give every output
  column a name that can't collide with a column on any table the function
  body queries — e.g. don't name one `order_id` if the function references
  `payments`/`order_items`/`order_activity` (all of which have a real
  `order_id` column), since the `returns table` names become PL/pgSQL
  variables in scope for the whole body and a same-named column reference
  becomes ambiguous at runtime, not at `CREATE FUNCTION` time. This broke
  `approve_payment`/`reject_payment` in exactly this way — fixed by
  prefixing every output column `out_*`. Apply the same prefix to any new
  `returns table` function.
- `NotificationBell` (mounted in `Navbar`, itself now also rendered in
  `(dashboard)/layout.tsx`) fetches via a Server Action
  (`getNotificationsAction`) called from a `useEffect`, not a Server
  Component prop passed down through `(marketing)/layout.tsx`. Don't
  "simplify" this to a layout-level fetch — `Navbar`'s layouts wrap
  `/category/[slug]`, the one statically generated page in this app, and a
  `cookies()`-using fetch in that layout would silently break its static
  generation the same way `static.ts`'s doc comment already warns about for
  the page itself.
- `trackOrderAction` (`/order-tracking`) is the one Server Action in this
  repo with no `requireUser()`/`requireAdmin()` — that's intentional, not a
  gap. It's a public lookup authorized by the order id + phone number pair
  itself (checked inside `ordersService.getOrderForTracking`'s query, not by
  a session), which is why it runs on the service-role client. Keep the
  not-found error one fixed generic message regardless of whether the order
  id or the phone was wrong — a more specific error turns the response into
  a way to probe which order ids exist. Never add a phone-only or
  partial-id lookup path here.
- `profiles` RLS has "view own" and admin-full-access, but **no customer
  UPDATE policy** — `updateProfileAction` runs on the service-role client
  for exactly that reason, found by actually testing the form (a
  session-scoped client fails this write silently, no useful error). Check
  the actual migration before assuming a table has a customer write policy
  just because it has a customer read one — several tables in this schema
  intentionally don't (`orders`, `subscriptions`, `profiles`).
- Anywhere a subscription's status renders (dashboard, order tracking, ...),
  compute it with `getSubscriptionStatus(expiryDate, cancelled)`
  (`src/utils/subscription.ts`), never read `subscriptions.status` directly
  for display. Nothing in this app transitions that column to
  `expiring_soon`/`expired` on its own — no cron/scheduled function exists —
  so the stored value can be stale indefinitely. This bit `order-tracking`'s
  subscription display once already (fixed to derive it); don't reintroduce
  the same bug in a new component.
- `reviews` uses a `status` text enum (`pending`/`approved`/`hidden`),
  not the `is_approved` boolean the original migration's own comment
  guessed a future moderation column would look like — matches
  `orders`/`payments`/`subscriptions` all using text status columns
  elsewhere in this schema. The verified-buyer rule (only a completed order
  for the product being reviewed) and the public-vs-own visibility split are
  both enforced by RLS, not just `createReviewAction`'s pre-checks — see
  [Product reviews](./PROJECT_STRUCTURE.md#product-reviews-productsslug-adminreviews).
  Don't relax those policies to work around a new call site; add the
  missing application-level pre-check there instead, the same way
  `createReviewAction` already does.
- `components/shared/star-rating.tsx`'s `StarRating` is read-only display;
  `features/reviews/components/star-rating-input.tsx`'s `StarRatingInput`
  is the one interactive/clickable version, only used in the review
  submission form. Don't use the input component just to show a rating.
- A page that needs the same data in both `generateMetadata` and the page
  component (e.g. `(marketing)/products/[slug]/page.tsx`) should wrap the
  loader in `cache()` from `"react"` so both share one fetch per request —
  and `generateMetadata`'s call should `.catch(() => null)`/fall back to
  `{}` rather than throw, since a metadata failure shouldn't decide the
  page's error/not-found behavior; that's the page component's job.
- Testing dev-mode error/not-found HTML with `curl`: the initial response
  for an error is a client-hydrated overlay shell
  (`<html id="__next_error__">`, `<meta name="next-error">`) — `curl`
  can't execute the JS that renders the real content, and the RSC flight
  payload embedded in `<script>` tags references other boundaries' text
  (e.g. `not-found.tsx`'s copy) as JSON-escaped strings even when they're
  not what's actually shown, which reads as a false positive if you grep the
  raw HTML without excluding `<script>` content. Verify real behavior via
  `npm run build && npm run start`, not `next dev`.
- `/shop` is the canonical product-listing page, not `/products` (which
  301/308-redirects to it via `next.config.ts`). Link to `ROUTES.shop`, not
  `ROUTES.products` — the latter is kept only as the redirect's source (see
  its `@deprecated` comment in `src/constants/routes.ts`).
- A Supabase query result destructured as `const { data } = await ...` and
  used as "found vs. not found" (e.g. a slug/id lookup before a main query)
  must also check `error` and throw on it — otherwise a genuine fetch
  failure and "no such row" are indistinguishable, and the failure silently
  reads as an empty result. This was a real bug in
  `productsService.listProducts`'s category-slug lookup; fixed, but check
  for the same shape (`const { data } = ...; if (!data) return/notFound()`
  with no `error` check) before adding another lookup query anywhere.
- `ShopFilters` (`features/products/components/`) is two independent
  `<form>`s (desktop sidebar + mobile `Sheet` drawer), not one form
  reused/duplicated — see its doc comment for why sharing one would silently
  submit the wrong copy's values. Follow that pattern for any future
  sidebar-on-desktop/drawer-on-mobile form, don't try to unify it into one
  form with CSS-only show/hide.
- "Popular" (`PRODUCT_SORTS`) has no real popularity metric behind it — it's
  newest-first, same as no sort at all. Don't build UI that implies it's
  ranking by actual popularity until a real signal (views, sales) exists.
- `ROUTES.category(slug)` (`/category/[slug]`, the landing page — banner,
  description, curated products, FAQ) and `ROUTES.productsByCategory(slug)`
  (`/shop?category=slug`, the filterable listing) are deliberately different
  links for different purposes — `CategoryCard` uses the former, a category
  page's "View all in Shop" button uses the latter. Don't collapse them to
  one; that's the same mistake the earlier `/products`-vs-`/shop` overlap
  was.
- `/category/[slug]` is the one route that's actually statically generated
  (`generateStaticParams` + `revalidate = 3600`) — it uses
  `createStaticSupabaseClient` (`src/lib/supabase/static.ts`), not
  `createServerSupabaseClient`, specifically to avoid the `cookies()` call
  that would force it dynamic. If you add data fetching to this page (or
  build another statically-generated one), keep using the static client —
  swapping in the cookie-based one silently undoes the static generation
  without erroring.
- Remote images go through `next/image`, not `<img>`, now that
  `next.config.ts` has `images.remotePatterns` configured — but that
  allowlist only covers `*.supabase.co/storage/v1/object/public/**`. Adding
  an image host outside Supabase Storage needs a new `remotePatterns` entry
  first, or `next/image` 400s on it.
- `ProductPurchasePanel` is one client component (variant selector + price +
  both purchase buttons), not three — picking a variant changes the price
  *and* what "Buy Now"/"Add to Cart" act on, so splitting it would mean
  prop-drilling selection state back up to a parent. Don't split it apart to
  "componentize more" without re-threading that state deliberately.
- `ProductRating` (the stars-and-count line by the product name) and
  `ProductReviews` (the full reviews section) are backed by two different
  `reviewsService` calls (`getRatingSummary` vs `listReviewsForProduct`) —
  fetch both separately if a page needs both, don't derive one from the
  other's result.
- The admin sidebar/mobile-nav/breadcrumbs/search (`components/admin/`) all
  read from one config, `constants/admin-nav.ts`'s `ADMIN_NAV` — add a new
  admin section link there, not in each component separately. An item's
  `adminOnly: true` flag controls whether managers see it in the nav, but
  it's a UX filter only (`getVisibleAdminNav`); the actual gate is still
  that page's own `requireAdmin()` call — don't treat hiding a nav link as
  a substitute for the page/action-level check.
- `AdminSearch` (the header search box) searches admin *section names*
  (`ADMIN_NAV`), not products/orders/customers — there's no cross-entity
  search backend for those yet. Don't wire it to a real data query without
  first deciding what "search" should mean across unrelated tables; a
  silently-empty result set for a real query is worse than the current
  honest, working nav search.
- The four `admin_*` Postgres functions backing `/admin/dashboard`
  (`admin_dashboard_stats`/`admin_revenue_daily`/`admin_revenue_monthly`/
  `admin_top_products`, in
  `supabase/migrations/20260830000100_add_admin_dashboard_analytics.sql`)
  are `security definer` with their own `if not is_staff() then raise
  exception ... '42501'` guard, not invoker-rights functions relying on
  each table's RLS — `profiles` only grants SELECT to `is_admin()`, not
  `is_staff()`, so a plain-RLS version of the customer count would be wrong
  for a manager. Any new admin aggregate function that reads `profiles`
  needs the same pattern, not a broadened `profiles` RLS policy.
- A Server Component that wraps a `cookies()`-based fetch in `try`/`catch`
  (the established pattern for graceful error states, see the marketing
  sections note above) must call `unstable_rethrow(error)` from
  `next/navigation` before its own catch logic — otherwise `next build`'s
  static-generation probe's `DYNAMIC_SERVER_USAGE` throw (and any
  `redirect()`/`notFound()` inside the try block) gets swallowed as a fake
  data-fetch failure instead of being handled by Next itself. Real bug,
  caught building `/admin/dashboard`'s error handling — every build logged
  a spurious "Failed to load admin dashboard overview" until this was
  added.
- Any RHF field whose raw DOM value doesn't already match its Zod schema's
  output type (a `<input type="number">`/`<textarea>` registered plain via
  `register("field")`) needs `register("field", { setValueAs: ... })` to
  convert it *before* validation — not `z.coerce.number()`/`z.preprocess`
  on the schema. Coerce/preprocess's declared *input* type is `unknown`,
  which breaks `zodResolver`'s type inference against an explicit
  `useForm<T>()` generic (first hit on the review form's `rating` field,
  then again on `ProductForm`'s price/duration and, differently, its
  optional text fields — an empty `<textarea>` is `""`, not `undefined`,
  so `.optional()` doesn't save it from a `.min()` failure either). If a
  new form field hits this, reach for `setValueAs`, not schema-level
  coercion — see `product-form.tsx`'s `toOptionalNumber`/`toRequiredNumber`/
  `toOptionalText` helpers.
- `product-images` is a public Storage bucket (`public = true`) — unlike
  `payment-screenshots` (private, service-role-only). Read access needs no
  RLS policy at all for the public URL path; write access
  (insert/update/delete) is still `is_staff()`-gated. Don't copy
  `payment-screenshots`' pattern (signed URLs, service-role client) for a
  new bucket without first deciding whether it actually needs to be
  private — most images meant for the public shop don't.
- `deleteProductAction` checks `productsService.isProductReferenced`
  (orders/subscriptions) before deleting and suggests deactivating instead
  — but that check is a UX nicety, not the real guarantee.
  `order_items.product_id`/`subscriptions.product_id` are both
  `on delete restrict`, so the database itself blocks a referenced
  product's hard delete regardless. Any new "delete" action on a table
  another table references with `on delete restrict` should follow the
  same shape: a friendly pre-check *and* a `23503` catch as the race-safe
  fallback, not just one or the other.
- `categoriesService.listCategories` (public-facing — `/shop`,
  `/categories`, `/category/[slug]`, the homepage's `CategoriesSection`)
  explicitly filters `status = 'active'` in the query itself, not just via
  RLS — a staff session browsing the public site would otherwise also
  match `"Categories: staff full access"` (permissive policies OR
  together) and see inactive categories leak into public listings.
  `listCategoriesForAdmin` (every status, search/sort) is the admin-only
  counterpart — used by `/admin/categories` itself *and* by the three
  admin product pages' category `Select`, so a product already assigned to
  a since-deactivated category doesn't silently lose that option. Don't
  use `listCategories` from anywhere under `(admin)`.
- `products.category_id` is `on delete set null`, not `on delete restrict`
  the way `order_items.product_id`/`subscriptions.product_id` are — the
  database would happily let a referenced category be deleted and null out
  every assigned product's category. `deleteCategoryAction`'s
  `isCategoryReferenced` pre-check is the *only* thing preventing that
  "unsafe deletion," not a database constraint — unlike
  `deleteProductAction`, there's no `23503` fallback to catch here, because
  there's no FK constraint that could ever raise one for this table.
- Image upload validation (`IMAGE_ALLOWED_TYPES`/`IMAGE_MAX_BYTES`/
  `IMAGE_EXTENSION`) lives in `constants/images.ts`, shared by every
  domain's upload service (`productsService.uploadProductImage`,
  `categoriesService.uploadCategoryImage`, ...) — add a new domain's image
  upload against these, don't redefine the same three constants again.
  The upload service functions/client components themselves (`ProductImageUpload`
  vs `CategoryImageUpload`) are deliberately still separate per domain, not
  a shared component — only the validation constants were worth
  extracting.
- Never call `ordersService.updateOrderStatus` (the raw setter) from an
  action or another service — always go through `changeOrderStatus`, which
  validates the transition against `utils/order-status.ts`'s
  `isValidOrderStatusTransition` and records an `order_activity` row.
  `updateOrderStatus` staying exported is only because `changeOrderStatus`
  needs it internally, not an invitation to call it directly and skip both
  checks.
- `AdminOrderFilterStatus` (`constants/orders.ts` — pending/payment_review/
  processing/completed/cancelled) is a *computed* 5-way status, not
  `orders.status` itself (which only has 4 values and never moves
  backward). Don't add a `.eq("status", filterStatus)` shortcut anywhere
  for "payment_review" or the post-payment "pending" bucket — both map to
  `status = "pending"` with a different `payment_status`, see
  `getAdminOrderFilterStatus`'s doc comment.
- Any new server-side use of PostgREST's `.or()` filter with an
  interpolated user-supplied search term must go through
  `escapeOrFilterValue` (`orders.service.ts`) first — `.or()`'s string
  argument is a small textual DSL where commas separate conditions, so an
  unescaped term containing one doesn't just fail to match, it can inject
  an unrelated extra filter clause into the query.
- `order_activity.actor_name` is captured at write time, not joined live
  from `profiles`, on purpose — see the migration's doc comment (same
  `profiles` RLS gap `admin_dashboard_stats()` was built to avoid: SELECT
  is "view own" + `is_admin()`-only, not `is_staff()`). Any new table that
  wants to display "who did this" for a staff-attributable action should
  snapshot the actor's name the same way, not add a nested `profiles(...)`
  select and assume every viewer can read every actor's profile.
- `order_activity` is staff-only — no customer-readable RLS policy at all
  (a first version briefly had a "view own" policy mirroring
  orders/payments/subscriptions; dropped in
  `20260831000100_refine_order_activity.sql` once it was clear an *audit
  trail of admin actions* shouldn't be customer-readable just because the
  order it's about is). Never add a customer-facing read path to this
  table — a customer's own order status comes from
  `orders.status`/`payment_status` directly (the existing badges), not
  from this log. Its `action` values are also specific
  (`order_created`/`payment_submitted`/`payment_approved`/
  `payment_rejected`/`order_processing`/`subscription_delivered`/
  `order_completed`/`order_cancelled`) — don't reintroduce a generic
  "status_changed" catch-all; `orders.service.ts`'s `STATUS_CHANGE_ACTION`
  map is what decides which specific action a fulfillment transition logs.
- `subscription_activity` mirrors `order_activity`'s shape and stays
  staff-only (no customer-readable policy) — but `subscription_deliveries`
  is deliberately different: it DOES grant the owning customer a "view own"
  `select` policy, because unlike an admin audit trail, delivery credentials
  are something the customer genuinely needs to read to use what they paid
  for. Don't default every new sensitive-data table to staff-only just
  because `order_activity`/`subscription_activity` are — decide per table
  whether the customer is a legitimate reader, not just staff.
- Sensitive credential storage (`subscription_deliveries`: account email/
  username/access instructions/profile info) is secured via RLS row-level
  access control (`is_staff()` + owner-only `select`), not column-level
  encryption. This codebase has no `pgp_sym_encrypt`/key-management
  infrastructure anywhere — `pgcrypto` is enabled only for
  `gen_random_uuid()` — and Supabase already encrypts data at rest at the
  storage layer. Don't add application-level encryption for a new sensitive
  field without first checking whether RLS already satisfies the actual
  requirement (usually "don't leak this on a public page," which is an
  access-control problem, not a cryptography problem); introducing
  `pgp_sym_encrypt` here would mean inventing new key-management
  infrastructure this app has never needed before.
- `find_customer_by_email` (resolves a customer's `profiles` row by email
  for admin subscription creation) is `security definer` with an
  `is_staff()` guard — same pattern as `admin_dashboard_stats()` and
  friends, needed for the same reason (`profiles`' SELECT policy is
  `is_admin()`-only, so a manager's session can't otherwise look up an
  arbitrary customer). Any future admin feature that needs to resolve a
  customer by some identifier (not browse a list — that stays
  `/admin/customers`, `requireAdmin()`-only) should follow this same narrow
  `security definer` + `is_staff()` shape, not broaden `profiles`' RLS.
- Not every admin write needs a `plpgsql` RPC the way `approve_payment`/
  `reject_payment` do — `subscriptionsService.extendSubscription`/
  `setSubscriptionExpiry`/`cancelSubscription`/`reactivateSubscription` are
  plain sequential service-layer calls (update, then log activity), the
  same shape as `ordersService.changeOrderStatus`. Reach for an atomic
  Postgres function only when a write is genuinely multi-table *and*
  race-sensitive (payment approval's provision-subscriptions-then-notify
  sequence, where a losing concurrent caller could otherwise act before its
  own claim failed) — a single-row update plus a single audit-log insert
  isn't that, and wrapping it in an RPC anyway would be unjustified
  complexity for a guarantee the simpler shape already provides.
- `escapeOrFilterValue` (the PostgREST `.or()`-filter escaping helper) lives
  in `src/utils/postgrest.ts`, shared by `orders.service.ts` and
  `subscriptions.service.ts` — it started as a private function inside
  `orders.service.ts` and was extracted once a second real call site needed
  the identical escaping logic. Import it for any new admin list's search,
  don't paste a second copy of security-sensitive string-escaping code.
- `/admin/customers` is `requireAdmin()`-only (like `updateUserRoleAction`
  already was) and lists every `profiles` row regardless of role — there's
  no separate staff-management page, and account-disable matters equally
  for a manager's account. Because the caller's session always already
  satisfies `is_admin()` on this page, `customersService
  .listCustomersForAdmin`/`getCustomerStats` are plain queries on the
  session client — no `security definer` RPC needed here, unlike
  subscriptions/payments/dashboard-analytics (all `requireStaff()`-callable,
  where a manager's session genuinely can't read `profiles`). Don't add one
  by default just because other admin features needed one; check whether
  this page's actual gate already satisfies the RLS the query needs first.
- `getCurrentUser()` (`lib/auth/session.ts`) returns `null` for a
  `profiles.disabled` account, not just an unauthenticated one — a
  `customersService.setCustomerDisabled` ban blocks *future* Supabase Auth
  sign-ins, but an already-issued access token stays valid until it expires/
  refreshes (PostgREST/RLS verify the JWT locally, they don't call back to
  GoTrue per request). Since `getCurrentUser()` re-fetches `profiles` on
  every request with no caching, this check is what actually cuts off an
  already-signed-in disabled user immediately, not just their next login
  attempt. Don't remove this thinking the Auth-level ban alone is
  sufficient — verified live that it isn't (an existing session keeps
  working through RLS-authenticated requests until the check was added).
- `customersService.setCustomerDisabled` is the one function in this app
  that needs `auth.admin.updateUserById` — GoTrue's admin API has no
  session-scoped equivalent, so `customers.actions.ts` is the one caller
  that creates `createAdminClient()` for a `profiles` write an admin's own
  session could otherwise make directly via RLS. It performs both the
  Auth-level ban *and* the `profiles.disabled` mirror-write on that same
  admin client in one function, rather than switching clients mid-function.
  `setCustomerDisabledAction` refuses to disable the caller's own account
  *and* refuses to disable any `admin`-role account outright (not just
  self) — "disable where appropriate" means neither a self-lockout nor one
  admin locking out another; re-enabling has no such restriction.
- Never read back a raw `auth.admin.getUserById()`/`listUsers()` response
  and pass it to a page or action result — those carry `identities`,
  `app_metadata`/`user_metadata`, `banned_until`, and other fields with no
  reason to ever reach a client. `types/customer.ts`'s `Customer` only
  carries fields already mirrored onto `profiles`
  (`id`/`email`/`fullName`/`phone`/`avatarUrl`/`role`/`disabled`/
  `createdAt`); `auth.admin.updateUserById` in `setCustomerDisabled` is
  called write-only, its response discarded beyond the error check. If a
  future feature needs something from Supabase Auth that isn't already on
  `profiles`, map it into an explicit, narrow field — don't pass a raw
  `User` object through.
- Coupon redemption is validated **twice**, on purpose, not redundantly:
  `couponsService.validateCoupon` is a read-only pre-check `checkoutService
  .placeOrder` runs *before* creating an order (fast, clean failure on an
  obviously-bad code — nothing to roll back yet); `redeem_coupon()` (Postgres
  function) is the real enforcement boundary, called as the deliberate
  *last* write in `placeOrder`'s sequence, after order/items/payment/
  activity already succeeded. That ordering is load-bearing: if
  `redeem_coupon` throws, `placeOrder`'s existing rollback-by-deleting-the-
  order path cleans everything up, because nothing coupon-specific happened
  before it to also undo. Don't move coupon redemption earlier in the
  sequence without re-deriving how the rollback would need to change.
- `redeem_coupon()` re-validates *everything* from scratch under its `for
  update` row lock (active/dates/usage limits) — it does not trust the
  result of the earlier `validateCoupon` pre-check at all, since the two
  calls aren't atomic with each other and state can change in between
  (proven live: two concurrent `redeem_coupon` calls against a
  `usage_limit: 1` coupon — exactly one succeeded). If you add a new
  coupon rule, add it to both functions' checks, not just one — the
  pre-check exists for UX, the redemption function is what's actually
  trusted.
- "Prevent negative totals" for a coupon discount means **clamp, don't
  reject** — `couponsService`'s internal `computeDiscount` caps the raw
  discount at `max_discount` (if set) and always additionally caps it at
  the order's own subtotal, so an oversized fixed-amount coupon just
  reduces the total to exactly 0 rather than failing the coupon outright.
  Don't "fix" this into a rejection; a customer with a discount that
  happens to exceed their cart shouldn't be blocked from using it.
- Coupon admin CRUD is a `Modal` form (`CouponFormDialog`/`CouponForm`),
  not separate `/admin/coupons/new`/`/admin/coupons/[id]/edit` pages — same
  shape and reasoning as `CategoryFormDialog`: enough scalar fields to
  justify a real form, not enough complexity (no image upload, no nested
  variants) to justify a dedicated route the way `ProductForm` needed one.
  Follow this pattern for a future admin entity with a similar shape rather
  than defaulting to the products-style separate-page pattern.
- `reviews.reviewer_name`/`reviewer_email` are a snapshot taken at
  submission time (`reviewsService.createReview`, reading the caller's own
  `profiles` row via "Profiles: view own" — permitted regardless of role),
  not a live join. This replaced a real bug: the old admin query joined
  `profiles` directly, but `profiles` SELECT is `is_admin()`-only while
  `/admin/reviews` is `requireStaff()`-gated, so a manager's session got
  `null` reviewer name/email back silently. Same fix shape as
  `orders.customer_name`/`subscriptions.customer_name`. If a future admin
  list needs to show info from `profiles` and is `requireStaff()`- (not
  `requireAdmin()`-) gated, check for this exact gap before assuming a live
  join will work for every caller.
- `reviews.status`'s third value is `hidden`, not `rejected` — renamed
  deliberately (`20260901000400_extend_review_moderation.sql`) to match
  what the action actually does (take a review out of public view,
  reversibly) rather than a workflow "rejection." `moderateReviewAction`
  allows moving between `approved`/`hidden` in either direction — it's not
  single-shot the way it originally was — `"pending"` is excluded as a
  target by `moderateReviewSchema`'s enum, since nothing should ever move a
  review backward to "awaiting moderation" once a decision's been made.
  Don't reintroduce a `status !== "pending"` guard that blocks re-hiding an
  approved review or re-approving a hidden one; the real protection against
  two staff racing the same review is `updateReviewStatus`'s
  `expectedStatus`-guarded update, not a restriction on which state a
  review starts from.
- `settings` (`/admin/settings`) stays fully admin-only at the RLS level —
  `select` included, no public/customer policy at all — even though none
  of its five sections (General/Payment/Delivery/SEO/Social) are secret.
  A public page that needs to *display* a setting reads it through
  `getPublicSettings()` (`src/lib/settings.ts`), which wraps
  `createAdminClient()`, never by relaxing the table's RLS. Don't add a
  public/customer `select` policy on `settings` to make a future read
  easier — that table's own original migration comment already
  recommended a narrowly-scoped public policy or RPC over *specific keys*
  if that's ever truly needed, not a blanket public read of the whole
  table.
- `getPublicSettings()` uses `createAdminClient()` specifically because it
  never calls `cookies()` (unlike `createServerSupabaseClient()`) — that's
  what makes it safe to call from `MarketingLayout`, which wraps
  `/category/[slug]`, the one statically-generated page in this app. A
  `cookies()`-using fetch there would silently break its static
  generation, the same trap `NotificationBell`'s doc comment already warns
  about one layer down. If a future public-facing read needs to run from a
  shared layout/component (not a single dynamic page), check whether it
  can use this same cookie-free-client pattern before assuming
  `createServerSupabaseClient()` is the only option.
- Never add a secret (an API key, a webhook signing secret, a gateway
  credential) as a new `settings` key just because the admin-editable form
  is already there — `settingsService.getSettings`'s doc comment states
  this as a durable rule, not a one-time note. Secrets stay in
  `src/lib/env.ts` (or a real secret store), the same place the app's
  existing Supabase keys/site URL already live.
- `Hero`'s "Contact Support" WhatsApp CTA deliberately still reads
  `siteConfig` (the hardcoded constant), not live `settings` — `HomePage`
  itself is synchronous on purpose (its own doc comment: static sections
  paint immediately, data-fetching sections are each their own Suspense
  boundary) so threading a settings fetch through it for Hero's sake would
  block that guarantee for a rarely-changed WhatsApp number. If Hero ever
  needs a live setting, wrap it in its own `<Suspense>` boundary rather
  than making `HomePage` itself async.
- Never determine "has this subscription/order/coupon *already happened*"
  (expired, past a deadline) with calendar-day math — compare instants
  directly (`date.getTime() < now.getTime()`), which needs no timezone at
  all. This was a real, since-fixed bug in
  `utils/subscription.ts`'s `getSubscriptionStatus`: using
  `differenceInCalendarDays` for the "expired" check meant a subscription
  that expired three hours ago *today* computed a same-day difference of
  `0`, not negative, and read as still active. `isSubscriptionExpired` is
  the instant-based check now; `daysUntilExpiry`/calendar-day thresholds
  ("expiring within N days") are for human-facing day counts only, checked
  *after* the instant-based expiry check, never instead of it.
- Any calendar-day boundary this app's business logic actually cares about
  ("expiring within N days," "today" for a report) must be computed in
  Bangladesh time (`utils/timezone.ts`'s `bangladeshCalendarDaysBetween`/
  `bangladeshCalendarDayCutoff`, plain UTC+6 arithmetic — Bangladesh has had
  no DST since 2009, so no `Intl`/timezone-database dependency is needed),
  never the server's ambient timezone (`new Date().getDate()`,
  `differenceInCalendarDays` with no explicit zone, etc.). The ambient
  timezone is whatever the Node process happens to run under (UTC on most
  hosting/edge runtimes, but not guaranteed) — silently different from
  Bangladesh, and exactly what caused `listSubscriptionsForAdmin`'s
  "Expiring Soon" filter and `getSubscriptionStatus`'s badge to be able to
  disagree at the boundary before this was fixed. Use
  `bangladeshCalendarDayCutoff` (not a plain `addDays(new Date(), n)`) for
  any new database range-query cutoff that needs to agree with a
  calendar-day threshold check elsewhere.
- Never store a computed day-count/status (`days_remaining`, a cached
  `is_expired` flag) on a row — `daysUntilExpiry`/`getSubscriptionStatus`
  are cheap to call and always accurate; a stored value goes stale the
  instant time passes regardless of whether the row was ever written to
  again. `admin_dashboard_stats()` used to have an
  `expiring_soon_subscriptions` column with exactly this class of problem
  (it counted a `subscriptions.status` value nothing ever actually writes,
  so it was permanently `0`) — removed in favor of
  `subscriptionsService.getSubscriptionLifecycleCounts`, computed fresh
  from `expiry_date` on every call.
- The notification center (`notifications.type`/`related_id`,
  `NotificationBell` in `Navbar`/`AdminHeader`, `/dashboard/notifications`)
  is documented in full in PROJECT_STRUCTURE.md's
  [Notification center](./PROJECT_STRUCTURE.md#notification-center-notificationbell-in-navbaradminheader-dashboardnotifications)
  section — read it before touching any notification trigger site. The
  short version: "do not create excessive duplicate notifications" means a
  real `(user_id, type, related_id)` existence check
  (`notificationsService.createNotificationIfNotExists`), not just careful
  call-site placement; `notifyStaff` fans a notification out to every
  enabled admin/manager and isolates each staff member's insert in its own
  `try`/`catch` (a real bug, caught live-testing this feature — one
  staff member's transient insert failure was silently aborting the whole
  fan-out loop for everyone after them); and there is still no cron
  anywhere in this app, so "Subscription expiring"/"Subscription expired"
  are detected opportunistically on `/dashboard`/`/dashboard/subscriptions`/
  `/admin/dashboard` page loads
  (`notificationsService.syncSubscriptionLifecycleNotifications`), always
  via `createAdminClient()` even on an already-staff page — `profiles`
  SELECT is `is_admin()`-only, not `is_staff()`, so a manager's own session
  would silently under-notify. Customers still have no INSERT policy on
  `notifications` at all (not even for themselves), so any
  customer-triggered notification path needs the service-role client;
  `checkoutService.placeOrder` already runs on one for exactly this reason,
  but `createReviewAction` (customer session) has to open its own just for
  the staff `new_review` fan-out.
- A full security audit (RLS/auth/Server Actions/uploads/rate
  limiting/IDOR/coupon-order-manipulation) is documented in
  [PROJECT_STRUCTURE.md's Security audit section](./PROJECT_STRUCTURE.md#security-audit).
  The two real fixes: `redeem_coupon()`'s Postgres function had no
  `authenticated`-role revoke, so a customer could call it directly via
  `supabase.rpc(...)` to fabricate coupon redemptions — fixed by revoking
  execute from `authenticated, anon, public` (all three; Postgres's
  implicit `PUBLIC` grant makes revoking only the named roles
  insufficient, a real mistake made and self-caught while fixing this).
  There was also no rate limiting anywhere — `src/lib/rate-limit.ts`
  (Postgres-table-backed, not in-memory, because Cloudflare/OpenNext gives
  no same-instance guarantee) is now wired into login/register/
  forgot-password/order-tracking/coupon-validation/checkout/review-creation.
  Any new customer-facing Server Action with real abuse potential (spam,
  enumeration, credential stuffing) should get a `checkRateLimit` call too,
  following the same by-IP/by-email/by-user key pattern already used
  there.
- Production deployment targets Cloudflare Workers via OpenNext, documented
  in full in [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md). This
  app's ISR (`revalidate = 3600` on the homepage/`/categories`/
  `/category/[slug]`/sitemap) plus on-demand `revalidatePath()` calls
  (`categories.actions.ts`) need real backing infrastructure — a KV
  namespace plus three Durable Objects (`DOQueueHandler`/`DOShardedTagCache`/
  `BucketCachePurge`) — configured in `wrangler.jsonc`/`open-next.config.ts`,
  or the adapter silently defaults every one of them to a no-op cache and
  those pages become fully dynamic instead of cached. The incremental cache
  is KV, not the OpenNext-recommended R2 — R2 needs a one-time
  account-level activation this deployment's Cloudflare account hadn't
  done, which surfaced as a real `403 "Please enable R2 through the
  Cloudflare Dashboard"` deploy failure; KV needs no such activation. See
  CLOUDFLARE_DEPLOYMENT.md's "Why KV, not R2" note for the full tradeoff
  (eventual consistency, lower write quota) before switching back.
  `wrangler.jsonc`'s `kv_namespaces[0].id` is a placeholder
  (`REPLACE_WITH_REAL_KV_NAMESPACE_ID`) until a real namespace is created
  and its id pasted in — deploy fails clearly until that's done, `--dry-run`
  doesn't catch it. `next.config.ts`
  deliberately does NOT call `initOpenNextCloudflareForDev()` — verified
  live that adding it hangs `next typegen`/`next dev` (the
  `WORKER_SELF_REFERENCE` service binding points the worker at itself,
  which isn't running yet locally), and nothing in this codebase calls
  `getCloudflareContext()` to need the binding simulation it exists for.
  Don't re-add it without re-verifying `next dev`/`typecheck` still work.
- `src/lib/env.ts` (client-safe, `getClientEnv()` only) and
  `src/lib/env.server.ts` (`import "server-only"` + `getServerEnv()`) are
  deliberately two files, not one — `getClientEnv()` is genuinely imported
  by `lib/supabase/client.ts` (a Client Component dependency), so it can't
  share a module with a `"server-only"` guard. Verified directly that the
  split actually works: a throwaway Client Component importing
  `getServerEnv()` from `env.server.ts` fails `next build` immediately
  with a `"server-only"` error and an import trace, not a silent
  `undefined` secret. Any new server-only env var goes in
  `env.server.ts`'s schema, never back into the shared `env.ts`. Payment
  gateway credentials (bKash/Nagad/SSLCommerz) and a WhatsApp number are
  NOT env vars in this app — see `.env.example`'s own comments and
  CLOUDFLARE_DEPLOYMENT.md's "Payment and WhatsApp configuration aren't
  environment variables here" section before adding either as one.
- Transactional email (`src/services/email/`) is documented in full in
  PROJECT_STRUCTURE.md's
  [Transactional email](./PROJECT_STRUCTURE.md#transactional-email-servicesemail)
  section. The short version: never import a provider (`providers/*`) or a
  template from outside `services/email/` — every caller goes through
  `email.service.ts`'s `sendXxxEmail()` functions, and the active provider is
  chosen only by `provider.ts`, only from `EMAIL_PROVIDER` (an environment
  variable). Every one of those functions is non-throwing (catches
  internally, logs, returns a result), so a call site never needs its own
  try/catch around an email send — it's already exactly as safe as the
  in-app notification it's fired alongside. The console provider (the
  default, zero-config) just logs the email; switching to Resend later is an
  env var change (`EMAIL_PROVIDER=resend` + `RESEND_API_KEY`), never a code
  change to a trigger site. `createNotificationIfNotExists` now returns
  whether it actually inserted a row (not `void`) specifically so
  `syncSubscriptionLifecycleNotifications` can gate its expiring/expired
  emails on that — without it, a customer revisiting `/dashboard` would get
  a fresh "subscription expiring" email on every single page load.
- WhatsApp support (`components/shared/whatsapp-button.tsx`'s `WhatsAppButton`/
  `FloatingWhatsAppButton`, `utils/whatsapp.ts`'s `buildWhatsAppUrl`/
  `buildOrderSupportMessage`) is documented in full in PROJECT_STRUCTURE.md's
  [WhatsApp support](./PROJECT_STRUCTURE.md#whatsapp-support-componentssharedwhatsapp-buttontsx)
  section. The short version: `phoneNumber` is always a required prop on
  `WhatsAppButton`, never a constant read inside the component — the real
  source is `/admin/settings`' `GeneralSettings.whatsappNumber` via
  `getPublicSettings()`, with `siteConfig.links.whatsapp`'s placeholder
  digits only as a fetch-failure fallback, same pattern as every other
  settings-backed field in this app. `Hero`'s "Contact Support" button is
  the one exception to "just call `getPublicSettings()` inline" — `HomePage`
  renders `Hero` synchronously outside any `Suspense` on purpose, so that
  one button is its own tiny async Server Component in its own nested
  `Suspense` boundary instead, not a reason to make `Hero`/`HomePage`
  async. `buildOrderSupportMessage(orderId, storeName)` only ever
  interpolates the store name and the same short order label
  (`order.id.slice(0, 8)`) used everywhere else in this app — never extend
  it (or any other prefilled `wa.me` message) to include a password,
  delivery credential, or payment/transaction detail; a `wa.me` link's
  `text` parameter is plainly visible in the URL itself, not a secure
  channel.
- Technical SEO (`src/lib/seo.ts`'s `buildMetadata`/`NOINDEX_ROBOTS`/
  `buildShopCanonicalPath`, `src/lib/json-ld.ts`, `src/app/robots.ts`/
  `sitemap.ts`) is documented in full in PROJECT_STRUCTURE.md's
  [Technical SEO](./PROJECT_STRUCTURE.md#technical-seo) section. Highlights
  worth not re-discovering the hard way: every indexable page's
  `generateMetadata` should call `buildMetadata`, not hand-build a
  `Metadata` object; `/shop`'s canonical (`buildShopCanonicalPath`)
  deliberately drops `search`/`sort`/`page` and keeps only `category`, so
  every filter combination against the same category converges on one
  canonical URL; `noindex` is applied at the *route-group layout* level for
  `(admin)`/`(dashboard)`/`(auth)` (three files cover ~30 pages, since none
  of them set their own `robots`) and per-page for the handful of
  `(marketing)` utility routes (`/cart`, `/checkout*`, `/order-tracking`,
  `/unauthorized`, `/forbidden`) that don't get a group-wide default;
  `/products/[slug]`/`/category/[slug]` return `{ robots: NOINDEX_ROBOTS }`
  (not `{}`) on a not-found slug, and `/category/[slug]` additionally
  goes `noIndex` for an inactive category since `getCategoryBySlug` doesn't
  filter `status`. Individual per-review `Review` JSON-LD nodes are
  deliberately never emitted (only `AggregateRating`) — this app never
  displays an individual reviewer's name publicly, and fabricating a
  uniform "Verified Customer" author across multiple `Review` nodes would
  both misrepresent the visible page and read as exactly the pattern
  Google's manipulated-review detection flags. `notFound()` on
  `/products/[slug]`/`/category/[slug]` renders correctly but returns HTTP
  `200` instead of `404` under `next start` in this environment — verified
  directly, confirmed pre-existing/not caused by this work; the `noIndex`
  metadata is what actually prevents the SEO harm here, not the status
  code, and a real fix (if ever needed) means investigating Next's
  `notFound()`/response-streaming behavior specifically, not this SEO
  layer.
- A production-performance pass is documented in full in
  PROJECT_STRUCTURE.md's [Performance](./PROJECT_STRUCTURE.md#performance)
  section. Highlights: `components/ui/table.tsx` has no `"use client"` on
  purpose (it never needed one); `LoadingSpinner`/`AuthCard`/
  `OrderTrackingResultView` use plain CSS entrance animation
  (`tw-animate-css`), not `framer-motion` — `Reveal` is the one legitimate
  `framer-motion` holdout (`whileInView`, a real scroll observer, not a
  one-shot fade) and isn't the same case. `RevenueChart`/`OrderStatusChart`
  are `next/dynamic`-lazy-loaded via `features/admin/components/dashboard-charts.tsx`
  (a small Client Component wrapper — `ssr: false` is disallowed directly
  in a Server Component, which is why the wrapper exists) — import
  `DashboardCharts`, not either chart directly; they're no longer
  re-exported from `features/admin/components/index.ts`. `getPublicSettings()`
  (`src/lib/settings.ts`) is `cache()`-wrapped at its own source now, not
  left for every call site to remember its own wrapper — it's independently
  called from at least 6+ places in one homepage request tree.
  `notificationsService.notifyStaff` batches its dedup-check + insert
  (one `SELECT` + one bulk `INSERT`, not one-of-each-per-staff-member in a
  loop) and accepts a pre-fetched `staffIds` list (`getStaffIds`) so a
  multi-event sweep fetches the staff list once, not once per event — still
  falls back to isolated per-staff inserts if the bulk insert itself fails,
  preserving the "one bad row can't drop every other staff member's
  notification" guarantee from that feature's own earlier bug fix. The
  homepage and `/categories` are now `revalidate = 3600` + a cookie-free
  Supabase client, same pattern `/category/[slug]` already used —
  `/products/[slug]` deliberately does *not* get this (`ProductReviews`
  needs `getCurrentUser()` for the signed-in visitor's own review
  eligibility, which must stay dynamic — "cache public data, never private
  customer data" cutting the other way), and `/shop` deliberately stays
  dynamic too (its content is a real function of per-request search/sort/
  filter params, not a caching gap). `ProductGridSkeleton`'s `lg:grid-cols-3`
  looks like a mismatch against `ProductGrid`'s bare 4-column default but
  is actually correct — it's only ever paired with `/shop`'s own
  3-column-override grid; check which real grid a skeleton pairs with
  before "fixing" an apparent column-count mismatch.
- A full production testing pass (every customer/admin flow, the full
  customer/manager/admin authorization-boundary matrix, and edge cases —
  invalid product/order/coupon IDs, duplicate payment/coupon submission,
  expired coupons/subscriptions) was run live with Playwright against a
  production build (`next build && next start`), not just reviewed. Found
  and fixed one real bug: `components/providers/auth-provider.tsx`'s
  `AuthProvider` only fetched the session once on mount, so right after
  `loginAction`/`logoutAction`'s server-side `redirect()` — confirmed via
  `performance.getEntriesByType("navigation")` to be a client-side
  transition, not a full page load — the navbar briefly showed "Login" for
  an already-authenticated user (or the account menu for an already-logged-
  out one), because a server-side sign-in/out never fires this browser
  client's `onAuthStateChange`. Fixed by adding a second effect keyed on
  `usePathname()` that re-fetches the session on every route change —
  verified live, before and after, that this closes the gap. Don't revert
  to a single mount-only effect; the desync was reproduced with Playwright,
  not theoretical. Everything else tested clean with no further code
  changes needed: RLS/authorization boundaries, rate limiting (the real
  login rate limit was hit while testing, confirming it works), the
  transaction-ID uniqueness constraint backing duplicate-payment
  protection, and `getSubscriptionStatus`'s expiry computation (verified
  identical "Expired" result on both the admin and customer dashboard for
  a subscription whose expiry was set into the past).
