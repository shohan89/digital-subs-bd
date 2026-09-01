# Digital Subs BD — Project Structure

Architecture reference for the codebase. This is a setup/architecture document,
not a feature log — update it when the *shape* of the project changes, not
when individual features are built.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, React Server Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui (Radix base, Nova preset) |
| Icons | Lucide (`lucide-react`) |
| Motion | Framer Motion |
| Backend | Supabase (Postgres, Auth, Storage) |
| Validation | Zod |
| Forms | React Hook Form + `@hookform/resolvers` |
| Deployment | Cloudflare Pages / Workers via `@opennextjs/cloudflare` |

## Folder structure

```
src/
├── app/                  # Routes only. No business logic.
├── components/
│   ├── ui/               # shadcn/ui primitives (generated — don't hand-edit, re-run shadcn CLI)
│   ├── shared/            # Hand-built cross-page components (Navbar, Footer, Container, ...)
│   ├── marketing/         # Homepage/marketing-page sections (Hero, FeaturedProducts, ...)
│   └── providers/        # App-wide client providers (theme, auth, cart, toaster)
├── features/             # Domain schemas/types — one folder per business domain
├── actions/              # Server Actions — thin: validate → call a service → revalidate
├── services/             # Data-access layer — talks to Supabase, framework-agnostic
├── hooks/                # Client-only React hooks ("use client")
├── lib/                  # Framework/infra glue: Supabase clients, env validation, auth session
├── types/                # Shared domain types + generated Supabase database types
├── utils/                # Small, pure, stateless helper functions
└── constants/            # Static config: routes, nav, site metadata, enums

supabase/
├── migrations/           # Numbered SQL migrations — see "Database schema" below
└── seed/                 # Seed data — 4 categories, 4 products (see "Database schema" below)
```

## Design system

Brand: **Digital Subs BD** — a premium, futuristic digital marketplace. The
brand is dark-first: `background`/`secondary` *are* the brand's near-black
and navy tones, not a "dark mode variant" bolted onto a light design.

### Brand colors

| Token | Hex | Role |
| --- | --- | --- |
| Primary | `#00A8FF` | Electric blue — primary actions, links, focus rings |
| Secondary | `#0F172A` | Dark navy — secondary buttons/surfaces, kept identical in both themes |
| Background | `#020617` | Near-black — the dark theme's page background |
| Accent | `#FFB800` | Amber/gold — highlights, badges, callouts |
| White | `#FFFFFF` | Pure white — light theme background, max-contrast text/icons |

These live in `src/app/globals.css` as fixed, non-theme-swapped tokens
(`--brand-primary`, `--brand-secondary`, `--brand-background`, `--brand-accent`,
exposed as Tailwind utilities `bg-brand-primary` etc.) for the rare case a
gradient or glow needs the *exact* brand hex regardless of theme.

**Components should not use `bg-brand-*` directly.** Use the semantic tokens
(`primary`, `secondary`, `background`, `accent`, `card`, `muted`, `border`,
`ring`, ...) instead — they resolve to the right value automatically in both
themes:

- **Dark** (`.dark`, the default — see `ThemeProvider` in
  `components/providers/index.tsx`): `background` = `#020617`,
  `card`/`secondary` = `#0F172A`, `foreground` is an off-white
  (`#F1F5F9`, not pure white — softer on a near-black surface).
- **Light** (`:root`): `background` = `#FFFFFF`, `foreground` = `#020617`.
  `secondary` stays `#0F172A` on purpose (a dark navy button reading as a
  deliberate brand choice against a white page, not a generic gray).

`primary` and `accent` are identical in both themes. Both use a **dark**
foreground (`#020617`), not white — `#00A8FF` and `#FFB800` are too light
for white text to clear WCAG AA (contrast ratios ≈2.6:1 and ≈1.7:1
respectively); dark text on either clears 7:1+. Don't override
`primary-foreground`/`accent-foreground` to white on a filled button — it
will fail contrast.

### Typography

Two font families, both loaded via `next/font/google` in `src/app/layout.tsx`:

- **`font-sans`** (Geist) — body text. Default on `<html>`.
- **`font-heading`** (Space Grotesk) — headings and anything that should
  read as "brand voice" (nav logo, dialog/sheet titles, `SectionTitle`).
  Applied automatically to `h1`–`h6` via `@layer base` in `globals.css`, so
  plain semantic HTML gets the right face without adding a class.

Size scale is Tailwind's default `text-xs`…`text-9xl` — deliberately not
reinvented. Headings use `tracking-tight` + `text-balance` (also set as a
base style) so multi-line headings wrap evenly instead of leaving a short
orphan word.

### Icons — Lucide

`lucide-react` (via the shadcn Nova preset, `iconLibrary: "lucide"` in
`components.json`). Import icons directly: `import { Menu } from
"lucide-react"`. Note lucide has no brand/logo icon set (no `Facebook`,
`Twitter`, etc.) — `Footer` uses `Globe` as a generic external-link icon for
social links instead.

### Motion — Framer Motion

`src/lib/motion.ts` centralizes the brand's motion language so animated
components don't each invent their own timing: `EASE_BRAND` (a quick,
confident ease-out curve) plus ready-made `Transition`/`Variants` —
`fadeIn`, `fadeInUp`, `scaleIn`, `staggerChildren`, `slideInFromRight`.
Reach for these before writing a new `transition={{ ... }}` inline.
`LoadingSpinner` is the reference example of using them.

### `components/ui/` — shadcn primitives

Installed via the shadcn CLI (Radix base, Nova preset) — don't hand-edit,
re-run `npx shadcn@latest add <component>` instead. Covers the requested
set: `button`, `card`, `badge`, `input`, `dialog`, `dropdown-menu`, `tabs`,
`avatar`, `skeleton`, plus `sheet`, `select`, `separator`, `table`, `alert`.

Two names in the brief map onto existing shadcn primitives rather than new
components, documented at the top of each file:

- **Toast** → `components/ui/toast.ts` re-exports `sonner`'s `toast` +
  the already-mounted `Toaster` (`components/ui/sonner.tsx`). The shadcn CLI
  only ships a Radix Toast for Base UI projects; Sonner is its own
  recommendation for Radix-based projects like this one.
- **Modal** → `components/ui/modal.tsx` is a `<Modal title="..."
  description="..." trigger={...}>` convenience wrapper composed from
  `Dialog` — Radix/shadcn don't have a separate "Modal" primitive because
  Dialog *is* the modal. Use `Dialog*` directly for layouts the composed
  API doesn't fit.

### `components/shared/` — hand-built components

Cross-page components that aren't generic UI primitives:

- **`Container`** — centered max-width wrapper (`default`/`narrow`/`wide`),
  responsive horizontal padding. Every section sits inside one.
- **`SectionTitle`** — eyebrow + heading + description, `left`/`center`
  aligned.
- **`LoadingSpinner`** — brand-colored, Framer Motion–driven, `role="status"`
  with an `sr-only` label.
- **`Reveal`** — the one Framer Motion client boundary most sections need:
  wraps children in a fade/slide-up that plays once when scrolled into view.
  Pass `delay={index * 0.06}` when revealing a mapped list so items stagger
  instead of popping in together. Data-fetching sections stay Server
  Components; only `Reveal` itself needs `"use client"`.
- **`Navbar`** — sticky, translucent-blur header. Desktop nav inline; mobile
  nav in a `Sheet` drawer (controlled, so tapping a link closes the drawer).
  Auth-aware via `useAuth()`: shows a "Login" button when signed out, an
  avatar `DropdownMenu` (Dashboard / Sign out) when signed in.
- **`Footer`** — brand blurb, link columns, social links, copyright.

Both are mounted in `(marketing)/layout.tsx` — every page under the
`(marketing)` route group gets them for free.

### `components/marketing/` — homepage/marketing-page sections

One component per homepage section (`Hero`, `CategoriesSection`,
`FeaturedProducts`, `WhyChooseUs`, `HowItWorks`, `Testimonials`, `Faq`,
`FinalCta`), plus `SectionSkeleton`. `(marketing)/page.tsx` composes them in
order — see [Data flow](#data-flow-for-a-domain) for how the data-fetching
ones talk to Supabase. `CategoryCard`/`ProductCard` themselves live in
`features/categories/components/`/`features/products/components/`, not here
— see those sections below. `CartSheet` lives in `features/cart/components/`,
not here — see [The cart](#the-cart-localstorage-no-backend-storage-is-swappable)
below.

`ProductCard`'s "Buy now" button still just links to the product detail page
rather than adding to the cart directly — adding straight from a listing
card (no variant to pick) is a reasonable future enhancement, not done here.

**Sections that fetch data** (`CategoriesSection`, `FeaturedProducts`,
`Testimonials`) each wrap their own `try/catch` around the service call and
render an inline `Alert` on failure — a Supabase hiccup in one section
doesn't take down the rest of the homepage (no reliance on the route's
`error.tsx` for this). `(marketing)/page.tsx` wraps each of them in its own
`<Suspense>` with a `SectionSkeleton` fallback, so the static sections
(`Hero`, `WhyChooseUs`, `HowItWorks`, `Faq`, `FinalCta`) paint immediately
instead of waiting on Supabase — there's no experimental PPR enabled, so any
`cookies()` call anywhere in the tree (which `createServerSupabaseClient`
makes) still marks the whole route dynamic (`ƒ` in the build output); the
`Suspense` boundaries are about streaming/perceived speed, not static
generation.

`Testimonials` renders `null` when there are zero *approved* reviews *or*
the fetch fails — treated the same way, deliberately, since testimonials
aren't essential content the way products/categories are and a load
failure shouldn't visibly disrupt the page for a non-essential section. See
[Product reviews](#product-reviews-productsslug-adminreviews) for how a
review actually gets from "submitted" to showing up here.

### Responsive, mobile-first, accessible

- Every component is styled mobile-first (unprefixed Tailwind classes are
  the small-screen style; `sm:`/`md:`/`lg:` layer up from there) —
  `Navbar`'s hamburger/desktop-nav split and `Footer`'s grid are the
  clearest examples.
- Interactive primitives inherit Radix's accessibility behavior (focus
  trapping, `Escape` to close, `aria-*` wiring) for free — `Dialog`,
  `Sheet`, `DropdownMenu`, `Tabs`.
- Icon-only controls always get an `aria-label` (see `Navbar`'s menu
  button); decorative icons get `aria-hidden="true"`.
- `LoadingSpinner` and any icon-only Button use `sr-only` text/`aria-label`
  so screen readers get an equivalent to the visual signal.

Business domains run through this structure end to end: **Authentication,
Products, Subscriptions, Admin, Checkout, Payments, Notifications, Order
Tracking, Profile, Reviews** each have the full shape — a
`features/<domain>` folder (Zod schemas + types), a
`services/<domain>.service.ts` (data access — for `Profile` that's
`authService.updateProfile`, since `profiles` doesn't have its own service
file yet, just the one function auth already owned), and an
`actions/<domain>.actions.ts` (Server Actions). A few things about that
list are less obvious than they look:

- **`Payments`'s "full shape" is verification, not creation.**
  `payments.actions.ts`/`features/payments/schemas.ts` are
  `approvePaymentAction`/`rejectPaymentAction`/`getPaymentScreenshotUrlAction`
  — reviewing an existing payment, not writing a new one. The payment *row*
  itself is only ever created by checkout (`checkoutService.placeOrder`, via
  `paymentsService.createPayment`) — there's no "create a payment" action of
  its own.
- **`Orders` is the one domain with no `actions.ts` at all.** Nothing
  creates or directly mutates an order outside `checkoutService.placeOrder`
  (creation) and `paymentVerificationService`
  (`orders.payment_status`, via `ordersService.updatePaymentStatus`) — the
  only other consumers are read-only (`ordersService.listOrdersForUser`/
  `getOrderById`/`getOrderForTracking`, from `/dashboard/orders`, the
  confirmation page, and `/order-tracking` respectively) or fulfillment-only
  (`admin.actions.ts`'s `updateOrderStatusAction`, for `orders.status`).
  Don't add a parallel `orders.actions.ts` for a new write path without
  first checking whether it belongs in `checkoutService` or
  `paymentVerificationService` instead.
- **`Order Tracking`'s action has no auth check at all — deliberately.**
  Every other `actions/*.ts` file starts with `requireUser()`/
  `requireAdmin()`; `trackOrderAction` doesn't, because it's a public,
  unauthenticated lookup by design (order id + phone number stand in for a
  session — see [Order tracking](#order-tracking-order-tracking)). Don't
  "fix" this by adding an auth check; that would break the feature.

`checkoutService`/`paymentVerificationService`/`orderTrackingService`
(`src/services/checkout.service.ts`/`payment-verification.service.ts`/
`order-tracking.service.ts`) are themselves cross-domain orchestration —
each composes `ordersService`/`paymentsService`/`productsService`/
`subscriptionsService`/`notificationsService` into one multi-table
write (the first two) or read (the third). `checkout`/`payments` own the
`features/`/`actions.ts` for the first two; `order-tracking` owns its own,
being the one of the three with a dedicated public surface of its own. See
[Checkout](#checkout-checkout-checkoutconfirmationorderid),
[Payment verification & subscriptions](#payment-verification--subscriptions-adminpayments),
and [Order tracking](#order-tracking-order-tracking) for all three, and
[Data flow](#data-flow-for-a-domain) below for how a full-shape domain
connects end to end.

### `src/app/` — routes

Route groups separate the four surfaces of the app, each with its own layout
and its own auth requirement:

| Group | URL prefix | Layout guard |
| --- | --- | --- |
| `(marketing)` | `/`, `/shop`, `/products/[slug]`, `/categories`, `/category/[slug]`, `/cart`, `/checkout`, `/checkout/confirmation/[orderId]` | none group-wide — `/checkout*` is individually protected, see below |
| `(auth)` | `/login`, `/register`, `/forgot-password` | none — public; middleware bounces signed-in users away |
| `(dashboard)` | `/dashboard/*` | `requireUser()` in `layout.tsx` |
| `(admin)` | `/admin/*` (landing page at `/admin/dashboard`) | `requireAdmin()` in `layout.tsx` |

Route groups (`(name)`) don't appear in the URL — they exist purely to give
each surface its own layout without nesting them under a shared path segment.

`src/middleware.ts` refreshes the Supabase session cookie on every request
and does a fast redirect for protected routes *before* any page renders;
`requireUser`/`requireAdmin` in each group's `layout.tsx` (or, for `/checkout`,
in the page itself — see [Checkout](#checkout-checkout-checkoutconfirmationorderid))
are the second, authoritative check (defense in depth — middleware matching
is prefix-based and easy to get subtly wrong, the layout/page check is not).
`middleware.ts`'s `PROTECTED_PREFIXES` is `[dashboard, admin, checkout]` —
add any future auth-gated route there, not just in the page.

There is no payment-gateway webhook route in this app — `payments` is a
manual-verification design (bKash/Nagad/Rocket "Send Money" + a submitted
transaction ID/screenshot, not an automated IPN callback). An earlier
`src/app/api/webhooks/payment/route.ts` assumed gateway automation
(`gateway_reference`/`gateway_response` columns that don't exist on
`payments`) and was removed when checkout was built for real — see
[Checkout](#checkout-checkout-checkoutconfirmationorderid).

`/admin` itself has no content of its own — it's a one-line
`redirect(ROUTES.adminDashboard)` (`src/app/(admin)/admin/page.tsx`). The
admin landing page is `/admin/dashboard`, mirroring the customer side's
`/dashboard`, so both post-login destinations follow the same shape. Don't
add real content back to bare `/admin`; add it to `/admin/dashboard`.

### Auth UI (`/login`, `/register`, `/forgot-password`)

Each page is a thin Server Component (`src/app/(auth)/*/page.tsx`) that
renders `AuthCard` (`src/features/auth/components/auth-card.tsx` — the
shared brand shell: logo, `Card`, Framer Motion entrance) wrapping a form
component. Each form (`login-form.tsx`/`register-form.tsx`/
`forgot-password-form.tsx`) is a Client Component using React Hook Form +
`zodResolver` against the schemas in `features/auth/schemas.ts`, built on
`components/ui/field.tsx` (`Field`/`FieldLabel`/`FieldError`) — this
project's shadcn preset ships a `Field` primitive instead of the classic
shadcn `Form`/`FormField`; there's no React Context wiring, fields are
connected directly via RHF's `register()`.

A form's `onSubmit` doesn't use `<form action={...}>` — it calls the
matching Server Action (`src/actions/auth.actions.ts`) directly inside
`useTransition`, builds `FormData` from RHF's already-validated values, and
on a non-success `ActionResult` calls `setError()` for each field so
server-side validation errors (and things client-side Zod can't catch, like
"invalid credentials") render through the same `FieldError` UI as
client-side errors, plus a top-level `Alert` for the general message.
`isPending` (from `useTransition`) disables the submit button and shows
`LoadingSpinner` — pass `className="text-current"` when nesting it inside a
`Button`, or it renders `text-primary` (invisible on the button's own
`bg-primary`).

**Login** redirects server-side on success — no client-side success state.
It supports a `?redirectTo=` query param (set by `middleware.ts` when it
bounced an unauthenticated request off a protected route): `LoginPage`
reads it from `searchParams` and threads it through as a hidden field;
`loginAction` validates it's an internal path (starts with `/`, not `//`)
before honoring it, and falls back to a role-based default
(`profiles.role` — `/admin/dashboard` for `admin`/`manager`, `/dashboard`
for `customer`) when absent. `middleware.ts`'s *other* redirect — bouncing
an already-authenticated request away from `/login` et al. — got the same
role-based treatment, but only queries `profiles` on that path, not on
every request (see `updateSession` in `src/lib/supabase/middleware.ts`).
See [Admin authorization](#admin-authorization-customermanageradmin) for
the full role model.

**Register** has an extra branch `login` doesn't need: if the Supabase
project requires email confirmation, `signUp()` succeeds but returns no
session yet, and redirecting to `/dashboard` immediately would just bounce
back to `/login`. `registerAction` returns
`actionSuccess({ requiresEmailConfirmation: true })` in that case instead of
redirecting, and `RegisterForm` swaps to a "check your email" panel.

**Forgot password** only ever confirms "if an account exists, we sent a
link" — never "no account with that email" — so the form can't be used to
enumerate registered emails. It's also the one place that's genuinely done
at the request-a-reset-link step but not further: nothing here builds the
`/reset-password` page the email link should land on (nor the Supabase
PKCE code-exchange route a production flow needs before it). Not in this
task's route list, and it's a distinct enough feature (session/token
handling, not just another form) to treat as separate follow-up work rather
than build implicitly.

### `src/features/<domain>/`

Per-domain Zod schemas and the TypeScript types inferred from them —
`loginSchema`, `createProductSchema`, `approvePaymentSchema`, etc. This is
the single source of truth for "what does valid input to this domain look
like," shared between Server Actions (parsing `FormData`/JSON) and
client-side form validation (`zodResolver(schema)` with React Hook Form).

`features/<domain>/components/` is where a domain's forms/UI live — `auth`
(see [Auth UI](#auth-ui-login-register-forgot-password)), `products` (see
[Product components](#product-components-featuresproductscomponents)
below), `cart`, `checkout`, `payments` (the admin verification table, not a
customer-facing form — see
[Payment verification & subscriptions](#payment-verification--subscriptions-adminpayments)),
`notifications` (`NotificationBell`), `order-tracking` (see
[Order tracking](#order-tracking-order-tracking)), `orders`
(`OrderListItem`), `subscriptions` (`SubscriptionCard`), `profile`
(`ProfileForm`), and `reviews` (`ReviewForm`/`StarRatingInput`/the admin
moderation table — see
[Product reviews](#product-reviews-productsslug-adminreviews)) all have one
now — see
[Customer dashboard](#customer-dashboard-dashboard-dashboardorders-dashboardsubscriptions-dashboardprofile).
Only `admin` still doesn't (its pages are either bare placeholders or, for
`/admin/payments`, compose components from `features/payments/components/`
instead of its own) — see
[What's deliberately not built yet](#whats-deliberately-not-built-yet).

`categories` also has one (`features/categories/components/` — see
[Category components](#category-components-featurescategoriescomponents)
below) despite not being one of the ten business domains below — it's
`products`' supporting data, same as `categories.service.ts` (no
`features/categories/schemas.ts` or `actions/categories.actions.ts` exist,
same reasoning as that file's note on why not).

A note on where these components live, since it was a deliberate call: a
request to build product UI named the files `features/products/
products.service.ts`/`products.types.ts`/`products.actions.ts` — this repo
keeps those three layers in top-level `services/`/`types/`/`actions/`
folders instead, consistently across all ten business domains. Rather than
give `products` alone a different layout, the service/types/actions stayed
where every other domain's already are, and the *component* library (which
this repo's convention already puts under `features/<domain>/components/`,
per `auth`) is what actually moved to `features/products/`.

### Product components (`features/products/components/`)

`ProductCard`, `ProductGrid`, `ProductBadge`, `PriceDisplay`, `FeatureList`,
`ProductGridSkeleton`, `ShopSearchBar`, `ShopFilters`, `ProductGallery`,
`ProductRating`, `ProductPurchasePanel`, `DeliveryInfo`, `PaymentMethodsList`,
`DeliverySteps`, `ProductFaq`, `ProductReviews` — composed together
(`ProductCard` uses `ProductBadge`/`PriceDisplay`/`FeatureList`;
`ProductGrid` lays out a list of `ProductCard`s with a staggered `Reveal`;
`/products/[slug]` composes most of the rest directly), and reused across
every place a product renders: the homepage's `FeaturedProducts`, `/shop`,
and `/products/[slug]`.

- **`ProductBadge`** renders nothing unless `comparePrice > price` — it's a
  computed "Save N%" badge, not a generic label prop. There's no `isNew` or
  similar; add that deliberately if it's ever needed, don't repurpose this
  one to mean something else.
- **`PriceDisplay`** is the one place `duration === 30 → "/ month"` lives —
  previously duplicated inline wherever a price was shown.
- **`FeatureList`** takes an optional `limit` (`ProductCard` passes `3`; the
  detail page's right column passes `4`, its own "Features" section passes
  none, showing everything).
- **`ProductCard`**'s image `alt` is the product name, not `""` — product
  images are meaningful content for SEO/screen readers, not decoration.
- **`ShopFilters`** renders as **two independent `<form>` elements** — a
  desktop sidebar (`hidden lg:flex`) and a mobile `Sheet` drawer (`lg:hidden`
  trigger) — not one form duplicated into two places. That distinction
  matters: if both copies of the category/price/duration/sort fields shared
  a single form (one CSS-hidden, one in the drawer), a browser would submit
  *both* sets of same-named fields on whichever one the visitor actually
  used, and the wrong value could win. Two separate forms sidestep that
  entirely — each submission only ever includes its own descendants.
- **`ProductGallery`** is a client component (selected-thumbnail state) —
  the only client piece of the detail page's left column. Falls back to a
  generic icon in a square panel when a product has neither `image` nor any
  `gallery` entries.
- **`ProductPurchasePanel`** is one client component covering the variant
  (duration) selector, price, and both "Buy Now"/"Add to Cart" actions —
  deliberately not split into three, since picking a variant changes the
  price *and* what the two actions actually add/order; splitting it would
  mean prop-drilling the selected variant back up through a parent. Variants
  have no `compare_price` column, so the strikethrough price only shows when
  no variant is selected (i.e. for the base product's own price).
- **`ProductRating`**/**`ProductReviews`** are two different things:
  `ProductRating` is the average-stars-and-count line next to the product
  name (`reviewsService.getRatingSummary` — averages in JS from the raw
  `rating` column, not a SQL `avg()`, since PostgREST's aggregate support is
  fiddly to get right without a live project to verify against);
  `ProductReviews` is the full "Customer reviews" section lower on the page
  (`reviewsService.listReviewsForProduct`), and also owns the
  review-submission form now — see
  [Product reviews](#product-reviews-productsslug-adminreviews) below.
  Both `StarRating` (`components/shared/star-rating.tsx`, read-only) — used
  by both of these and by `Testimonials` — used to be three copies of the
  same inline JSX; extracted once a third consumer showed up, same reasoning
  as `status-badges.ts`'s extraction.
- **`ProductFaq`**/`features/categories/components/category-faq.tsx`'s
  `CategoryFaq` are templated with the product/category name, not fetched
  from Supabase — there's no FAQ table for either. See `CategoryFaq`'s note;
  the same reasoning applies here.

### Category components (`features/categories/components/`)

`CategoryCard` (the compact card used in `CategoriesSection`/`/categories`),
`CategoryBanner` (the `/category/[slug]` page's hero-style H1 section), and
`CategoryFaq`. Both `CategoryCard` and `CategoryBanner` share one icon
fallback (`getCategoryIcon`/`CATEGORY_ICONS` in `src/constants/categories.ts`)
since no category in the seed data has an `image` — don't duplicate that map
into a component again if a third place ever needs it.

`CategoryFaq`'s questions are templated with the category name
(`` `Are ${categoryName} subscriptions genuine?` ``), not fetched from
Supabase — there's no `category_faqs` table, and none was asked for. If real
per-category editorial FAQ content is ever needed, that's a deliberate
schema addition, not something to retrofit into this component.

### `/category/[slug]`

The one route in this app that's genuinely statically generated —
`generateStaticParams` fetches every category slug at build time via
`createStaticSupabaseClient` (see `src/lib/supabase/`), and `export const
revalidate = 3600` refreshes each page in the background at most once an
hour (ISR). `dynamicParams` is left at its default `true`, so a category
added after the last build still resolves on-demand instead of 404ing until
the next deploy. If `generateStaticParams`'s own fetch fails at build time
(caught, returns `[]`), the whole build still succeeds — every category page
just renders on-demand instead of being pre-rendered, rather than a
transient Supabase hiccup failing the deploy.

Same error-handling shape as `/products/[slug]`: the category lookup and the
products-in-category lookup are two separate `try/catch`s, so a failure in
one doesn't block the other from rendering, and a genuine fetch failure
reads as "couldn't load this," never as "this category doesn't exist"
(`notFound()`) or a crash.

The page's own product section is a curated preview (`FEATURED_PRODUCTS_LIMIT`
= 8, no pagination) with a "View all in Shop" button
(`ROUTES.productsByCategory`) deep-linking into `/shop?category=<slug>` for
the full filterable/sortable/paginated listing — this page and `/shop` serve
different purposes (landing page with unique content vs. general catalogue
browsing), unlike the earlier `/products` vs `/shop` overlap that got
resolved by redirecting one into the other.

### `/shop` and `/products/[slug]`

`/shop` is the canonical product-listing page — search, category/price
range/duration filters, and sort (Popular / Price low-high / Price
high-low), backed by `productsService.listProducts`'s `filters`/`options`
params (see below). `/products` (the old listing route) permanently
redirects here via `next.config.ts`'s `redirects()` (query string forwarded
automatically, so old `/products?category=x` links still land correctly) —
`/products/[slug]` (the detail page) is unaffected, only the bare list route
moved. `ROUTES.products` stays defined only as that redirect's source, not a
link target — see its `@deprecated` note in `src/constants/routes.ts`.

Both `/shop` and `/products/[slug]` fetch through `productsService`/
`categoriesService` directly (Server Components, no client-side loading
state) and handle their own failures locally rather than relying on the
route's `error.tsx` — same reasoning as the homepage's data-fetching
sections (see
[`components/marketing/`](#componentsmarketing--homepagemarketing-page-sections)):
a Supabase hiccup should read as "couldn't load this," not look identical to
an empty result or "this product doesn't exist" (`notFound()`), or crash the
whole page. (`listProducts`'s category-slug→id lookup learned this the hard
way — it used to ignore that sub-query's `error` entirely, so a lookup
*failure* silently read as "no such category," returning an empty product
list instead of surfacing the real error. Any future filter that adds
another lookup query before the main one needs to check its `error` too.)

**`/shop`** — the search bar is its own always-visible `<form>` with hidden
inputs carrying the current category/price/duration/sort values, so
searching doesn't reset the other filters (and vice versa — `ShopFilters`'
forms carry a hidden `search` input the same way). Neither uses the
Radix-based `components/ui/select.tsx` for its dropdowns, deliberately —
that needs client-side JS and doesn't post its value through a plain form
submit without extra wiring; plain `<select>` does, keeping the whole
filtering flow working with zero required client JS beyond `Sheet`'s own
open/close state. Pagination is limit/offset-based, fetching one extra row
(`PER_PAGE + 1`) to know whether a "Next" page exists instead of running a
separate `COUNT` query. The product grid itself is wrapped in
`<Suspense fallback={<ProductGridSkeleton />}>` (keyed on the serialized
search params, so a new filter combination re-shows the fallback instead of
diffing over the old results) — the search bar and filter sidebar render
immediately since they don't depend on the products query.

"Popular" (one of the three sort options) has no real popularity metric
behind it — no view/sales-count column exists — so it's implemented
identically to leaving `sort` unset: newest first. See `PRODUCT_SORTS`'
comment in `src/features/products/schemas.ts` before assuming it means
anything more specific.

**`/products/[slug]`** — `generateMetadata` builds a real per-product
title/description/OpenGraph/canonical, and the page renders a
`schema.org/Product` JSON-LD block (price, availability, category, and
`aggregateRating` when at least one review exists) for rich snippets.
`loadProduct` is wrapped in React's `cache()` so `generateMetadata` and the
page component (which both need the product) share one fetch per request
instead of two. A failed `getRatingSummary` call is treated as non-critical
(caught separately from the main product load, falls back to
`{ average: 0, count: 0 }` → renders "No reviews yet") rather than taking
down the whole page over a secondary query.

Left column: `ProductGallery` (main image + thumbnails, `next/image`, falls
back to a generic icon panel with neither `image` nor `gallery`). Right
column, top to bottom: category link, name + `ProductBadge`, `ProductRating`,
short description, `ProductPurchasePanel` (duration/variant selector, price,
Buy Now / Add to Cart), a 4-item `FeatureList`, then `DeliveryInfo` +
`PaymentMethodsList`. Below the two-column layout: a full Description
section, a full (unlimited) `FeatureList` under "Features", then
`DeliverySteps` ("How Delivery Works"), `ProductFaq`, and `ProductReviews` as
full-width sections.

"Buy Now" (in `ProductPurchasePanel`) skips the cart entirely and opens a
pre-filled WhatsApp chat (`siteConfig.links.whatsapp?text=...`) — matching
the manual bKash/Nagad order flow `payments.transaction_id`/`screenshot`
already implies (see the Database schema section) — rather than link
nowhere or fake a real checkout. "Add to Cart" adds to the client-side cart
described below.

### The cart (`localStorage`, no backend — storage is swappable)

`CartProvider` (`components/providers/cart-provider.tsx`) + `useCart`
(`src/hooks/use-cart.ts`) — same shape as `AuthProvider`/`useAuth`: one
context mounted app-wide in `components/providers/index.tsx`, a single hook
to read it. State (`items`, `isLoading`, `addItem`, `removeItem`,
`updateQuantity`, `clearCart`, `itemCount`, `subtotal`) is held in React
state; persistence goes through a `CartStorageAdapter` (`src/lib/cart/
storage.ts`) rather than calling `localStorage` directly — `load()`/`save()`,
both `async` even though the default `localStorageCartAdapter` implementation
is synchronous under the hood, so a future database-backed adapter (keyed off
the signed-in user, doing real network calls) can drop in as `<CartProvider
storage={...}>` without touching `useCart` or any consumer. Both `load` and
`save` are wrapped in `try/catch` — private browsing, a full quota, or
corrupted JSON all just mean the cart starts empty, not a crash. `isLoading`
covers the one-tick gap between mount and the adapter's first `load()`
resolving, so `/cart` and `CartSheet` can render a loading state instead of
flashing "empty" before real data arrives. See the doc comment in
`storage.ts` for what a Supabase-backed adapter would need to handle
(auth-awareness, diffing instead of full-replace, merging a guest cart on
login) — deliberately not built yet.

**This is deliberately not backed by a `cart`/`cart_items` table.** See
`src/types/cart.ts`'s doc comment. Cart UI lives in `src/features/cart/`,
not `components/marketing/`:
- `components/cart-sheet.tsx` — the drawer opened from `Navbar`'s cart icon
  (badge shows a live item count); ends with a "View full cart" link to
  `/cart`.
- `components/cart-page-content.tsx` — the client component behind the
  `/cart` page (`app/(marketing)/cart/page.tsx`, a thin Server Component
  shell for metadata only); full item list + a sticky order-summary sidebar
  on large screens.
- `components/cart-line-item.tsx`, `empty-cart.tsx`, `cart-summary.tsx` —
  shared pieces used by both the sheet and the page (`compact` prop on
  `CartLineItem` shrinks the thumbnail for the sheet). `CartSummary`'s button
  is "Proceed to Checkout" → `ROUTES.checkout`, not a WhatsApp hand-off — see
  [Checkout](#checkout-checkout-checkoutconfirmationorderid) below.

The cart itself is still `localStorage`-only (see `CartStorageAdapter`
above) — only checkout's order-creation write is real/server-side now. A
database-backed cart (replacing `localStorageCartAdapter`) is still a
separate, not-yet-needed step; nothing about checkout requires it, since
`CheckoutForm` reads the client cart directly and hands its contents to the
order-creation action in one shot.

### Checkout (`/checkout`, `/checkout/confirmation/[orderId]`)

The real order-creation flow `CartSummary`'s "Checkout via WhatsApp" used to
stand in for — see `src/features/checkout/`. Both routes live under
`(marketing)` but are individually protected (`middleware.ts`'s
`PROTECTED_PREFIXES` includes `ROUTES.checkout`, and each page also calls
`requireUser()` itself — same defense-in-depth pattern as `(dashboard)`/
`(admin)`): `orders.user_id` is `not null` and RLS requires `auth.uid()`, so
there's no guest-checkout path this schema supports.

**`CheckoutForm`** (`features/checkout/components/checkout-form.tsx`) is one
client component covering the whole flow — customer info, order summary,
payment method, transaction ID + screenshot upload, submit — not a
multi-step wizard. React Hook Form + `zodResolver(checkoutFormSchema)`
handles the text fields (name/email/phone pre-filled from the signed-in
`UserProfile`, payment method, transaction ID); the payment screenshot is
deliberately **not** part of that Zod schema (`FieldList`/`File` don't exist
outside the browser, and mixing them into a schema shared with server code
is awkward) — it's validated separately, both client-side (fast feedback)
and again server-side (what's actually trusted). On submit, `CheckoutForm`
builds a `FormData` (not a plain object, unlike most other actions in this
repo) since it has to carry an actual `File` alongside the rest of the
fields; the cart snapshot (`{productId, variantId, quantity}[]`) rides along
as one JSON-encoded field.

**`createCheckoutOrderAction`** (`src/actions/checkout.actions.ts`) →
**`checkoutService.placeOrder`** (`src/services/checkout.service.ts`) is the
real write: `orders` → `order_items` → upload the screenshot to Storage →
`payments`. Two things make this action's shape different from the
`orders`/`payments`/`products` actions elsewhere:

- **Pricing is never trusted from the client.** `placeOrder` re-fetches each
  line's price from `products`/`product_variants` itself
  (`productsService.getProductsByIds`/`getVariantsByIds`) before computing
  `total_amount` — the request body's cart snapshot carries `productId`/
  `variantId`/`quantity` only, no `price`.
- **It runs on the service-role client, not the caller's session-scoped
  one.** Supabase's JS client can't run `orders`/`order_items`/`payments`
  writes in one Postgres transaction, so a failure partway through is
  cleaned up by deleting the order it just created
  (`ordersService.deleteOrder` — cascades to `order_items`/`payments` via
  `ON DELETE CASCADE`, and `placeOrder` also removes an already-uploaded
  screenshot on a later failure). Customers have no DELETE policy on
  `orders` (it's a financial record, not disposable per-user data), so that
  rollback can't happen through RLS at all — hence the service-role client.
  `userId` still comes only from `requireUser()` in the action, never from
  client input, so this isn't a privilege-escalation path, just a rollback
  necessity.

**Payment screenshots** go to a private Storage bucket, `payment-screenshots`
(created via `supabase.storage.createBucket` with the service-role key, not
a migration — no SQL/Storage RLS policies exist for it, since it's only ever
read/written through this service-role-client code path, never directly
from the browser). `payments.screenshot` stores the object's **path** within
that bucket, not a public URL — a future admin-review UI would sign a URL to
view it, not link to it directly.

**Order/payment status right after checkout** is always `pending`/`pending`
(`orders.payment_status`/`payments.status`) — this is a manual-verification
design (see the `payments` migration), so nothing at checkout time marks an
order paid automatically. See
[Payment verification & subscriptions](#payment-verification--subscriptions-adminpayments)
for what happens next.

**`customer_name`/`customer_email`/`customer_phone` on `orders`** are a
checkout-time snapshot, not a live read of `profiles` — added specifically
so an order's delivery contact stays fixed even if the profile changes
later (see the migration adding these columns). The confirmation page and
any future admin order view should read these off the order, not
`profiles`.

### Coupon management (`/admin/coupons`) and checkout discounts

`requireAdmin()`, not `requireStaff()` — coupon configuration has direct
revenue impact, matching CLAUDE.md's "Coupons" rule. Modal-form CRUD
(`CouponFormDialog`/`CouponForm`), not separate new/edit pages — same
reasoning and shape as `CategoryFormDialog`: coupons don't have enough
fields or file-upload complexity to justify a dedicated route the way
`ProductForm` does. No pagination on the admin list either, same "this
store's row count stays small" reasoning as categories.

`coupons` shipped in an earlier migration deliberately leaner than a real
coupon table (code/discount_type/discount_value/expiry_date only — see that
table's own migration comment) —
`supabase/migrations/20260901000200_add_coupon_management.sql` fills in
`min_order_amount`/`max_discount`/`start_date`/`usage_limit`/
`per_user_usage_limit`/`is_active`/`used_count`, adds `coupon_usages`
(redemption history, `coupon_id` `on delete restrict` — same "financial/
audit record, not disposable" reasoning as `order_items.product_id`, and
what makes "delete when safe" real: `deleteCouponAction` follows
`deleteProductAction`'s exact shape, an `isCouponReferenced` pre-check plus
a `23503` catch fallback, not the `on delete set null`/pre-check-only shape
categories use), and adds `orders.discount_amount`/`orders.coupon_code` (the
latter a snapshot, not a live join — same reasoning as
`customer_name`/`customer_email`). No separate `orders.subtotal_amount`
column: the subtotal is always recoverable as `total_amount +
discount_amount`, so storing it too would just be a derivable duplicate —
every place that shows a Subtotal/Discount/Total breakdown
(`OrderItemsCard`, the checkout confirmation page, `CheckoutOrderSummary`)
computes it this way.

**`is_active` and `expiry_date` are two independent "off" switches, not
one** — matching the task's own separate "Prevent: Expired coupons /
Inactive coupons" requirements. A coupon can be `is_active: true` and still
show "Expired" (nothing auto-flips `is_active` off at expiry, same
"nothing transitions this automatically" precedent as
`subscriptions.status`), and `getCouponStatus`
(`src/utils/coupon.ts`) — a computed, not stored, display status mirroring
`getSubscriptionStatus` — checks `is_active` first, so "Inactive" wins even
within an otherwise-valid date range. The admin list's actual filter is
simpler than this computed status, though: just `is_active` (Active/
Inactive), matching `CATEGORY_STATUSES`' shape — a filter for every computed
state (Scheduled/Expired/Limit reached) wasn't asked for and would be
one filter dimension too many for what this page needs.

**Checkout validates every coupon server-side, twice, for two different
reasons — never once, and never trusting a client-sent discount at all.**
`createCheckoutOrderSchema` accepts only a `couponCode` string; there is no
discount field anywhere in that schema, so a tampered request literally has
nowhere to put a fake discount amount, the same structural guarantee that
already existed for item prices.
1. `couponsService.validateCoupon` — a **read-only pre-check**, called from
   `checkoutService.placeOrder` *before* any write, checking existence/
   `is_active`/date range/`min_order_amount`/usage limits and computing the
   discount. Purely for fast, clean UX on an obviously-bad code — failing
   here means no order was ever created, nothing to roll back.
2. `redeem_coupon()` (Postgres function,
   `20260901000200_add_coupon_management.sql`) — the **real enforcement
   boundary**, called as the deliberate *last* write in `placeOrder`'s
   sequence, after order/items/payment/activity all already succeeded. Same
   row-lock-then-claim idiom as `approve_payment`
   (`for update` on the coupon row, re-validates everything from scratch,
   only then increments `used_count` and inserts `coupon_usages`) — one real
   Postgres transaction, so a coupon that raced past its usage limit between
   step 1 and step 2 is still caught here, not just at the friendlier
   pre-check. If this throws, `placeOrder`'s existing rollback-by-deleting-
   the-order path handles cleanup — nothing coupon-specific needed its own
   undo, precisely *because* redemption is the last step, not an earlier
   one. Verified under genuine concurrent load, the same methodology as
   `approve_payment`'s race test: two simultaneous `redeem_coupon` calls
   against a `usage_limit: 1` coupon — exactly one succeeded, `used_count`
   ended at exactly 1, exactly one `coupon_usages` row exists. `language
   plpgsql volatile` (invoker rights, no `security definer`) — unlike
   `find_customer_by_email`, this is only ever called from `placeOrder`,
   which already runs on the service-role client (see
   `checkoutService`'s own doc comment for why), so there's no RLS gap here
   to bypass that the caller doesn't already have.

**"Prevent negative totals" means clamping the discount, not rejecting the
coupon.** `couponsService`'s internal `computeDiscount` caps the raw
percentage/fixed amount at `max_discount` (if set) and *always* additionally
caps it at the subtotal itself — a fixed discount larger than the order
just reduces the total to exactly 0, it doesn't get refused outright.
Verified live: a coupon with a fixed discount far exceeding a real cart's
subtotal correctly shows a `Tk0` total, never a negative one.

**Checkout's "Apply coupon" step is a preview, not a commitment.**
`CheckoutOrderSummary` calls a new `validateCouponAction`
(`requireUser()`, service-role client — `coupons`' RLS is `is_admin()`-only,
so even a single-code lookup can't run on a customer's own session) purely
to show a Subtotal/Discount/Total breakdown before the customer finishes the
form. The `subtotal` this preview computes from is the client-held cart
total — deliberately not re-verified against anything, because it's never
trusted for the real charge either way: `placeOrder` independently re-
derives the subtotal from the actual re-priced order items and re-runs both
validation steps completely fresh at submission time, so an inflated preview
subtotal could at most show a misleading *preview* number, never change what
gets charged.

### Payment verification & subscriptions (`/admin/payments`)

The other half of checkout — an admin reviewing a submitted
`transaction_id`/screenshot and moving it to `verified`/`rejected`, which is
what actually grants access and tells the customer. Tabs for
Pending/Verified/Rejected (`AdminPaymentToolbar`) plus an "All" view, with
columns Payment ID/Order ID/Customer/Method/Transaction ID/Amount/
Screenshot/Status/Date (`AdminPaymentTable`) and row actions View
screenshot/Approve/Reject (`AdminPaymentRowActions`) — all in
`src/features/payments/components/`, backed by
`paymentsService.listPaymentsForAdmin` for the list and
`src/services/payment-verification.service.ts`
(`approvePayment`/`rejectPayment`) for the two mutations, called from
`src/actions/payments.actions.ts`
(`approvePaymentAction`/`rejectPaymentAction`/`getPaymentScreenshotUrlAction`).

**Approve/reject are single atomic Postgres functions, not sequential
PostgREST calls.** `payment-verification.service.ts` is now just two thin
`.rpc()` wrappers around `approve_payment`/`reject_payment`
(`supabase/migrations/20260831000200_add_payment_verification_functions.sql`)
— one `.rpc()` call is one Postgres transaction, so every write inside
(payment status, order payment/fulfillment status, subscription
provisioning, `order_activity` entries, notification) commits or rolls back
together. This is deliberate: Supabase's JS client has no client-side
`BEGIN`/`COMMIT`, so a PL/pgSQL function is the only way to get real
multi-table transactional guarantees on this stack — see
[Checkout](#checkout-checkout-checkoutconfirmationorderid)'s note on why
`placeOrder` instead has to *simulate* rollback by deleting what it just
created; this feature doesn't need that workaround because it can use a
real transaction.

**Duplicate-approval prevention is the function's first write, not a
separate check-then-act step**: `approve_payment`/`reject_payment` each
open with a conditional `update payments set status = ... where status =
'pending' returning order_id into v_order_id` — Postgres's row-level
locking makes two concurrent callers race safely (exactly one update
matches), and nothing downstream, subscription provisioning included, runs
unless that claim succeeded. Verified under genuine concurrent load (two
independent sessions calling `approve_payment` on the same payment via
`Promise.all`), not just sequential double-clicks.

**Both functions run with invoker rights (no `security definer`)**, on the
admin's own session-scoped client — every table they touch (`payments`,
`orders`, `order_items`, `products`, `subscriptions`, `order_activity`,
`notifications`) already grants full read/write to `is_staff()`, so there's
no RLS gap to bypass (contrast with `admin_dashboard_stats()` and friends,
which genuinely need `security definer` because `profiles` only grants
`is_admin()`).

**Never trust client-submitted amount or order id**: both actions' Zod
schemas accept only `paymentId` (a UUID); `approve_payment`/`reject_payment`
look up the order, user, and line items server-side from the payment row
itself inside the function — there is no code path where a browser-supplied
order id or amount reaches either function.

**`approve_payment`'s write order** (all inside the one transaction):
provision one `subscriptions` row per distinct product in the order → log
`subscription_delivered` → set `orders.payment_status = 'paid'` → log
`payment_approved` → if the order is still `pending`, advance it to
`processing` and log `order_processing` ("update order status
appropriately": a verified payment is what unblocks fulfillment, so this is
the one transition it's safe to make automatically; an order some other
path already advanced past `pending` is left untouched) → insert the
customer notification. `reject_payment` is narrower: claim the payment as
`rejected`, set `orders.payment_status = 'failed'` (order `status` itself is
untouched — nothing to fulfill), log `payment_rejected` with the admin's
optional reason, notify the customer. Both are logged as
`order_activity` entries — see the `order_activity` bullet under
[Order management](#order-management-adminorders-adminordersid) for the
full action vocabulary and RLS.

**PL/pgSQL pitfall worth knowing before touching either function**: a
`returns table (...)` clause's column names become variables visible
throughout the function body. An earlier version named one `order_id`,
which collided with the real `order_id` column on `payments`/`order_items`/
`order_activity` and raised "column reference is ambiguous" on every call —
only surfaced by testing, since the ambiguous reference wasn't hit until the
`returning order_id into ...` statement ran. Fixed by prefixing every output
column `out_*` (`out_payment_id`, `out_order_id`, `out_order_status`). Apply
the same prefix convention to any new `returns table` function whose body
queries a table with a same-named column.

**Subscription duration is a real gap, not a made-up default**:
`order_items` has no `variant_id` (see [Checkout](#checkout-checkout-checkoutconfirmationorderid)),
so if a cart item was added under a specific variant, that variant's
duration is lost by the time a payment is reviewed — `approve_payment` falls
back to a flat 30 days (`coalesce(duration, 30)` in the migration) whenever
a product's own `duration` is null. Every currently-seeded product has an
explicit `duration`, so this only bites a future variant-only product —
fixing it for real means adding `variant_id` to `order_items`, not patched
around here.

**Viewing a screenshot still needs the service-role client**:
`getPaymentScreenshotUrlAction` runs on `createAdminClient()`, not the
admin's session client — the `payment-screenshots` bucket has **no Storage
RLS policies at all** (see [Checkout](#checkout-checkout-checkoutconfirmationorderid)'s
note on why: it's designed to only ever be touched by service-role code).
Using the session client here gets silently denied — a real bug caught
during testing, not a hypothetical. If you add another Storage-touching
admin action, default to `createAdminClient()` for it too.

### Subscription management (`/admin/subscriptions`, `/admin/subscriptions/[id]`)

Full admin CRUD over `subscriptions`, on top of the automatic provisioning
`approve_payment()` already does — search/filter/sort/pagination on the list
(`AdminSubscriptionToolbar`/`AdminSubscriptionTable`), and on the detail page:
Extend/Change expiry/Cancel/Reactivate (`SubscriptionStatusActions`), a
sensitive delivery-credentials editor (`SubscriptionDeliveryCard`), and a
full audit trail (`SubscriptionTimelineCard`). Schema in
`supabase/migrations/20260831000300_add_subscription_management.sql`.

**Three schema additions, all in that one migration:**
- `subscriptions` gained `order_id` (nullable, `on delete set null` — a
  manual admin-created subscription has none), `customer_name`, and
  `customer_email` — the same checkout-time-snapshot pattern as
  `orders.customer_name`/`customer_email`, and for the same reason: `profiles`
  only grants `is_admin()` read, not `is_staff()`, so a manager's session
  joining it directly for the admin list's "Customer" column would silently
  get nulls back. `listSubscriptionsForOrder` (used by
  `OrderSubscriptionsCard` on `/admin/orders/[id]`, replacing its old
  best-effort match on product id) and the admin list's customer search both
  depend on these being real, queryable columns, not a live join.
- `subscription_deliveries` — sensitive account-delivery credentials
  (account email/username, access instructions, profile/PIN info) as a
  **separate table** from `subscriptions`, not columns on it, so every
  existing `select("*")` against `subscriptions` (the admin list,
  `listExpiringSubscriptions`, ...) doesn't start silently over-fetching
  credentials it never needed. RLS: `is_staff()` full access + a customer
  "view own" `select` (the owning customer genuinely needs to read their own
  credentials to use the subscription — unlike `order_activity`, this one
  *does* get a customer-readable policy). "Store sensitive information
  securely" / "never on a public page" is enforced as RLS row-level access
  control here, not column-level encryption — this codebase has no
  `pgp_sym_encrypt`/key-management infrastructure anywhere (`pgcrypto` is
  enabled only for `gen_random_uuid()`), and Supabase already encrypts data
  at rest at the storage layer, so adding application-level encryption would
  be a new, inconsistent security primitive for a guarantee RLS + at-rest
  encryption already provide. Displayed on `/dashboard/subscriptions` inside
  `SubscriptionCard` (an optional `delivery` prop, omitted entirely if
  nothing's been provisioned yet) — that page is the one legitimate
  non-public place a customer's own credentials should ever render.
- `subscription_activity` — an append-only audit trail, byte-for-byte the
  same shape and staff-only-RLS reasoning as `order_activity` (see that
  table's entry above): `subscription_created`/`subscription_extended`/
  `expiry_changed`/`subscription_cancelled`/`subscription_reactivated`/
  `delivery_updated`, `old_value`/`new_value` free-text (an ISO date string
  for expiry-related actions, a status string for cancel/reactivate, null
  for delivery_updated), `actor_name` a write-time snapshot not a live join.
  `approve_payment()` now also logs a `subscription_created` entry (actor =
  the approving staff member) for every subscription it auto-provisions, so
  a subscription's own history is complete regardless of which path created
  it — see that function's updated body in the same migration.

**No `utils/subscription-status.ts` transition table**, unlike
`orders`/`utils/order-status.ts`. The stored `subscriptions.status` column
only ever actually holds `'active'` or `'cancelled'` in this app —
`'expiring_soon'`/`'expired'` are `getSubscriptionStatus`'s *computed*
display values only, nothing ever writes them (see that function's own doc
comment). Cancel/reactivate is genuinely just a two-state toggle, so
`subscriptions.service.ts`'s `cancelSubscription`/`reactivateSubscription`
validate the one invalid move each (cancelling an already-cancelled row,
reactivating a non-cancelled one) inline rather than importing a shared
transition table built for two states.

**Manual "Create subscription" resolves a customer by email through a new
`security definer` RPC, `find_customer_by_email`** — same `is_staff()`-guard
pattern as `admin_dashboard_stats()` and friends
([Admin dashboard analytics](#admin-dashboard-analytics-admindashboard)), needed for
exactly the same reason: `profiles`' SELECT policy is `is_admin()`-only, so
a manager's session can't otherwise resolve "customer@example.com" to a
user id and display name to populate the new subscription's
`customer_name`/`customer_email` snapshot. Narrow — one row,
three columns — not a general profiles-browsing capability (that stays
`/admin/customers`, `requireAdmin()`-only). An optional `orderId` is
validated to belong to the resolved customer before being accepted, so a
wrong-customer order id can't silently link to someone else's order.

**Extend vs. Change expiry are two different actions on purpose**, matching
the task's own vocabulary: `extendSubscription` adds N days on top of
`max(current expiry, now)` (so extending an already-lapsed subscription
doesn't start counting from a past date — same date math the old, unused
`renewSubscription` used); `setSubscriptionExpiry` sets an exact replacement
date. Both are blocked on a cancelled subscription (reactivate first) via a
shared `assertNotCancelled` guard. Neither runs through a `plpgsql` RPC the
way `approve_payment`/`reject_payment` do — each is one `update` plus one
`subscription_activity` insert, the same lower-stakes "sequential
service-layer calls" shape as `ordersService.changeOrderStatus`, not the
atomic-transaction shape that only genuinely multi-table, race-sensitive
writes (payment approval's subscription-provisioning-plus-notification)
need.

**`escapeOrFilterValue`** (the `.or()`-filter escaping helper originally
private to `orders.service.ts`) moved to `src/utils/postgrest.ts` once
`subscriptions.service.ts`'s admin-list search needed the identical
escaping logic — a second real call site, not a hypothetical one, so this
was worth deduplicating rather than pasting a second copy of
security-sensitive string-escaping code.

#### Subscription lifecycle status: timezone-safe, instant-vs-calendar-day

`getSubscriptionStatus`/`daysUntilExpiry` (`src/utils/subscription.ts`) had
a real, since-fixed timezone bug: both used date-fns'
`differenceInCalendarDays` with no explicit timezone, which resolves
calendar-day boundaries against the JS runtime's *ambient* timezone (UTC on
most hosting/edge runtimes, but not guaranteed) — not Bangladesh, where this
business and its customers actually are. Two separate problems, fixed
together in `src/utils/timezone.ts` + a rewrite of `subscription.ts`:

1. **"Expired" was calendar-day-based, not instant-based** — a subscription
   that expired three hours ago *today* computed a calendar-day difference
   of `0`, not negative, and so classified as `active`/`expiring_soon`
   instead of `expired`. Fixed by `isSubscriptionExpired` (`expiry_date`'s
   `getTime()` vs `now`'s — a plain instant comparison, which needs no
   timezone at all, since two absolute instants don't require one to
   compare). `getSubscriptionStatus` checks this *before* the "expiring
   soon" calendar-day threshold, so an expired-today subscription is caught
   immediately rather than falling through to a day-count that would still
   read `0`. Verified live: a subscription seeded to expire 2 hours before
   test time (same Bangladesh calendar day) correctly shows `Expired`
   everywhere — the customer dashboard's grouped section, the admin list's
   filter tabs, and the subscription's own detail-page badge.
2. **"Expiring within N days" used the ambient server timezone for calendar-
   day boundaries, not Bangladesh's** — `utils/timezone.ts`'s
   `bangladeshCalendarDaysBetween`/`bangladeshCalendarDayCutoff` fix this
   with plain UTC+6 arithmetic (Bangladesh Standard Time has had no DST
   since 2009, so this needs no `Intl`/timezone-database dependency, just an
   offset shift before reading UTC calendar-day getters — see that file's
   doc comment for why calendar days specifically, not a rolling `N*24h`
   window: "expiring in 3 days" is a human calendar-day concept, and
   `bangladeshCalendarDayCutoff` produces a cutoff *instant* that agrees
   exactly with the calendar-day check, for use in a Postgrest range query).
   `subscriptions.service.ts`'s `listSubscriptionsForAdmin` (the "Expiring
   Soon" filter tab) and `listExpiringSubscriptions` (the admin dashboard's
   widget) both moved from a plain `addDays(new Date(), n)` duration cutoff
   to this — before the fix, the admin list's instant-based filter and
   `getSubscriptionStatus`'s calendar-day-based badge could silently
   disagree at the boundary by up to 6 hours depending on server TZ; now
   every caller (list filter, dashboard widget, per-card badge) agrees on
   the exact same set of rows.

**`getSubscriptionLifecycleCounts`** (`subscriptions.service.ts`) backs
`/admin/dashboard`'s "Expiring Within 3 Days"/"Expiring Within 7 Days"/
"Expired Subscriptions" widget (`SubscriptionLifecycleStats`) — three plain
`count`-only queries using the same Bangladesh cutoffs, replacing
`admin_dashboard_stats()`'s old `expiring_soon_subscriptions` column
(removed by `20260901000600_fix_subscription_lifecycle_stats.sql`, a
`drop function` + recreate since the return-column list changed — see the
[Payment verification](#payment-verification--subscriptions-adminpayments)
section for why `create or replace` alone can't do that). That column
counted rows with a literal `status = 'expiring_soon'`, a value nothing in
this codebase ever writes to `subscriptions.status` — confirmed by grepping
every write path before removing it — so it was always `0`, dead weight
never even rendered by any component. The 3-day/7-day counts are
deliberately cumulative, not a mutually-exclusive bucket (see
`SubscriptionLifecycleCounts`'s doc comment) — "expiring within 7 days"
naturally includes anything expiring even sooner, two independent urgency
views rather than a 4-7-day-only range.

**`groupSubscriptionsByStatus`** (`utils/subscription.ts`) buckets a
customer's subscriptions by computed status for `/dashboard/subscriptions`'
Active/Expiring Soon/Expired/Cancelled sections (`SubscriptionStatusSection`,
one per bucket, skipped entirely when empty) — replacing the old flat,
ungrouped grid. The home dashboard overview (`/dashboard`)'s compact top-3
preview grid deliberately stays flat/ungrouped — too few items for sections
to add value there.

**No `days_remaining` column anywhere, deliberately** — `daysUntilExpiry`
is always computed at render/query time from `expiry_date`, never stored or
cached. A stored value would go stale the instant time passes regardless of
any write to the row, which is exactly the kind of bug class this whole
fix was about avoiding; don't add one, even as a denormalized/"for
performance" column — every call site in this app already computes it
cheaply (one function call, no query), so there's no performance case for
storing it either.

### Notification center (`NotificationBell` in `Navbar`/`AdminHeader`, `/dashboard/notifications`)

`notifications` now has `type` (a closed CHECK-constraint vocabulary —
`order_received`/`payment_submitted`/`payment_approved`/`payment_rejected`/
`subscription_delivered`/`subscription_expiring`/`subscription_expired`/
`review_published`/`review_hidden`/`new_order`/`new_payment_submission`/
`new_review`, mirrored in `constants/notifications.ts`'s `NOTIFICATION_TYPES`
— keep both in sync) and `related_id` (an informal, untyped-FK reference to
whatever row the notification is about — an order, subscription, or review
id depending on `type`; no real FK, since it points at different tables per
type). `subscription_expiring` is the one type sent to two different
audiences (a customer about their own subscription, and every staff member
as the admin list's "Subscription expiring") — same type, different
`user_id`, not two types.

RLS: `select`/`update own` (read + "mark read"), a new **`delete own`**
policy (added for this feature — there was previously no customer delete
path at all, only `is_admin()` "full access"), and `is_staff()` "staff
insert" (a manager creating a notification for a *different* user, e.g.
`moderateReviewAction` notifying a reviewer). There is still **no customer
INSERT policy at all** — a customer session can never create a notification,
even for themselves — so any customer-facing code path that needs to notify
(checkout, subscription delivery from a staff session is fine, but a
*customer-triggered* new_review staff-fanout is not) reaches for
`createAdminClient()` instead.

**Dedup ("do not create excessive duplicate notifications") is a real
existence check, not just a design intention**:
`notificationsService.createNotificationIfNotExists` looks for an existing
row by `(user_id, type, related_id)` before inserting; `notifyStaff` (fans a
notification out to every enabled `role in ('admin','manager')` profile) 
runs that check per staff member, isolated in its own `try`/`catch` so one
staff member's insert failing (a transient PostgREST blip) can't silently
abort notifying the rest — a real bug hit and fixed while testing this
feature, not hypothetical.
`notificationsService.createNotification` (no dedup) stays available for a
call site already guaranteed to run exactly once per event
(`approve_payment()`/`reject_payment()`'s own SQL inserts;
`moderateReviewAction`'s status-transition check already prevents a
repeat).

**Trigger call sites**, each choosing a client per the same RLS reasoning as
everywhere else in this app:

- `checkoutService.placeOrder` — customer `order_received` + staff
  `new_order` after the order write; customer `payment_submitted` + staff
  `new_payment_submission` after the payment write. Both pairs fire only
  *after* the entire checkout sequence (order → items → payment → coupon
  redemption) has committed, not inline as each step happens — anything
  that throws earlier rolls the order back by deleting it (see
  [Checkout](#checkout-checkout-checkoutconfirmationorderid)), and a
  notification referencing a since-deleted order would be a dangling,
  confusing one. Wrapped non-fatal (like `notifyReviewer` below): the order
  already succeeded by then, so a notification failure shouldn't turn into
  a false "could not place your order." Runs on `checkout.actions.ts`'s
  existing `createAdminClient()` — no new client needed here.
- `subscriptionDeliveryService.upsertDelivery` — customer
  `subscription_delivered`, but only the *first* time a subscription gets
  delivery info (an existence check on `subscription_deliveries` before the
  `upsert`, since `upsert` itself can't distinguish insert from update).
  Runs on the caller's own staff session client
  (`updateSubscriptionDeliveryAction` already uses
  `createServerSupabaseClient()`) — `is_staff()` "staff insert" covers
  notifying a different user.
- `createReviewAction` — staff `new_review` after the review insert
  succeeds. Customer session, so this needs its own `createAdminClient()`
  (a customer can read neither other users' `profiles` — needed to resolve
  who's staff — nor insert into `notifications` at all), unlike every other
  action in `reviews.actions.ts`.
- `moderateReviewAction`'s `notifyReviewer` — customer `review_published`/
  `review_hidden`. Pre-existing before this feature; only gained `type`/
  `relatedId` fields, same title/message text as before.
- `approve_payment()`/`reject_payment()` (SQL, see
  [Payment verification & subscriptions](#payment-verification--subscriptions-adminpayments))
  — customer `payment_approved`/`payment_rejected`, `related_id` = the
  order id. Pre-existing inserts, only gained `type`/`related_id` columns
  in a follow-up migration (`create or replace`, same
  `plpgsql`/`security definer` shape, no behavior change).

**"Subscription expiring"/"Subscription expired" have no cron behind
them** — there is no scheduled-job infrastructure anywhere in this app (see
[Subscription management](#subscription-management-adminsubscriptions-adminsubscriptionsid)'s
note that nothing transitions `subscriptions.status` on its own). Instead,
`notificationsService.syncSubscriptionLifecycleNotifications` recomputes
status live from `expiryDate` (`getSubscriptionStatus`, same function every
other display of subscription status already uses) and dedup-creates
whatever's newly due, called opportunistically from three page loads:
customer `/dashboard`, customer `/dashboard/subscriptions`, and
`/admin/dashboard`. `expiring_soon` notifies both the subscription's own
customer and every staff member (matches the admin list's "Subscription
expiring"); `expired` notifies only the customer — there's no "Subscription
expired" entry in the admin list. All three call sites use
`createAdminClient()`, never the page's own session client — even
`/admin/dashboard`'s staff session can't safely stand in for it, since
`notifyStaff` needs to read every staff member's `profiles` row and
`profiles` SELECT is `is_admin()`-only, not `is_staff()` (same gap
`admin_dashboard_stats()` was built to route around); a manager viewing
`/admin/dashboard` would otherwise silently under-notify. All three are
`await`ed, not fire-and-forget — this app deploys to Cloudflare via
OpenNext, where the invocation can end before an un-awaited promise
finishes. A subscription extended after already notifying "expiring soon,"
then approaching expiry again later, won't re-notify under the same dedup
key — deleting the old notification is the accepted escape hatch, not new
"reset on extend" logic.

**`NotificationBell` still fetches via a Server Action on mount, not a
Server Component prop** — same reasoning as before: `(marketing)/layout.tsx`
wraps `/category/[slug]`, the one statically generated page in this app, and
a `cookies()`-using Server Component fetch in that layout would silently
break its static generation. `getNotificationsAction` sidesteps this by
running client-side, after hydration. It's mounted via `Navbar` (in both
`(marketing)/layout.tsx` and `(dashboard)/layout.tsx`) **and** via
`AdminHeader` (`(admin)/layout.tsx`) — admins are very much part of this
flow now, unlike before this feature.

The dropdown now also supports **delete** (per item, optimistic local
removal, no confirmation modal — unlike every other "delete" in this app,
a wrong click here just costs re-reading a notification, not lost business
data) and a "View all notifications" link to the full center. Reads
(`getNotificationsAction`) and mutations
(`markNotificationReadAction`/`markAllNotificationsReadAction`/
`deleteNotificationAction`) all still use the customer's own session-scoped
client — `notifications`' RLS already scopes every one of these to
`user_id = auth.uid()`, so there's no reason to reach for anything more
privileged for a caller acting on their own notifications.

**`/dashboard/notifications`** (`ROUTES.dashboardNotifications`, a 5th
`DashboardNav` tab) is the full paginated list — same "fetch `pageSize + 1`,
slice, check `hasMore`" convention as every other paginated list in this
app. `NotificationList` (`features/notifications/components/`) is the
client half (mark-as-read/mark-all/delete, optimistic local state, no
`router.refresh()` — same low-stakes reasoning as the bell's delete) driven
by the page's server-fetched initial list. There is no `/admin/notifications`
page — the task that built this out of the box specified a *dropdown* for
admin (already covered by `AdminHeader`'s `NotificationBell`) and a full
*page* only for the customer route, so that split is deliberate, not a gap.

### Transactional email (`services/email/`)

A provider-agnostic email layer, separate from `services/<domain>.service.ts` on purpose — it
takes no `DbClient` (it has no database access of its own), unlike every other service in this
app, which is itself the signal that it's a different category: an infra/side-effect concern, not
a domain data service.

```
src/services/email/
  types.ts               EmailProvider interface, EmailMessage, EmailSendResult, EmailAddress
  provider.ts             selects the active EmailProvider from EMAIL_PROVIDER (env var)
  providers/
    console-email-provider.ts   dev-safe default — logs the email, never sends, never fails
    resend-email-provider.ts    real Resend REST call (fetch, no SDK dependency)
  templates/
    layout.ts              shared inline-styled HTML wrapper + escapeHtml + plain-text footer
    order-confirmation.ts, payment-received.ts, payment-approved.ts, payment-rejected.ts,
    subscription-delivered.ts, subscription-expiring.ts, subscription-expired.ts
  email.service.ts        the public API — sendOrderConfirmationEmail(), etc.
```

**"Don't hardcode a specific email provider into business logic" is enforced by layering, not by
convention alone**: `EmailProvider` (`types.ts`) is the only interface any caller depends on;
`provider.ts` is the *only* file that picks a concrete implementation, purely from `EMAIL_PROVIDER`
(an environment variable — see [Environment variables](#environment-variables)); and `providers/`
classes are constructed only by `provider.ts`, never imported anywhere else. `email.service.ts` is
the one file everything outside `services/email/` should ever import — no caller anywhere in the
app imports a template or a provider directly. Switching from the console provider to Resend later
is an environment variable change, not a code change.

**Every exported function in `email.service.ts` is non-throwing** — it catches internally, logs,
and returns `EmailSendResult` rather than rejecting. Every call site that sends an email treats it
exactly like the in-app notification it fires alongside (see
[Notification center](#notification-center-notificationbell-in-navbaradminheader-dashboardnotifications)):
a failure to email a customer must never fail the order/payment/subscription action that already
succeeded. `provider.ts` itself is similarly defensive — `EMAIL_PROVIDER=resend` with no
`RESEND_API_KEY` set logs a warning and falls back to the console provider rather than throwing at
startup.

**The seven required events and where each is triggered**, all customer-facing (no admin/staff
email requirement — staff already have the admin dashboard and in-app notifications for this):

- **Order confirmation** + **Payment received** — `checkoutService.placeOrder`, right after the
  in-app `order_received`/`payment_submitted` notifications, in the same non-fatal block, only
  once the entire checkout write sequence has committed (see
  [Checkout](#checkout-checkout-checkoutconfirmationorderid) for why that ordering matters — a
  rolled-back order must never generate a "confirmed" email).
- **Payment approved** / **Payment rejected** — `payments.actions.ts`'s
  `approvePaymentAction`/`rejectPaymentAction`, via a shared `notifyPaymentDecision` helper. Unlike
  the in-app notification (inserted directly by `approve_payment()`/`reject_payment()`'s own SQL),
  the email needs the order's customer name/email/items, which those RPC wrappers don't return —
  one extra `ordersService.getOrderById` read on the same staff session client pays for that,
  rather than widening the RPC wrappers' return shape for an email-only concern.
- **Subscription delivered** — `subscriptionDeliveryService.upsertDelivery`, alongside the in-app
  `subscription_delivered` notification, same first-time-only gate. Deliberately never includes the
  actual account credentials in the email body — same reasoning `subscription_deliveries`' RLS
  already encodes; the email is just the "it's ready" ping, the customer reads the real details on
  `/dashboard/subscriptions`.
- **Subscription expiring** / **Subscription expired** —
  `notificationsService.syncSubscriptionLifecycleNotifications`, gated on
  `createNotificationIfNotExists`'s return value (it now returns whether it actually inserted a
  row, not `void`) so a repeat page visit that's already notified for a subscription's current
  lifecycle state doesn't also re-send the email — sending a fresh email on every dashboard reload
  would be exactly the kind of duplicate this app's notification system was built to avoid, just in
  a different channel.

**Templates are plain functions, not a JSX/React-email renderer** — each returns
`{ subject, html, text }` from a shared inline-styled `renderEmailLayout` (`templates/layout.ts`;
table-based markup, since `<style>` blocks and flexbox/grid render inconsistently across
Gmail/Outlook/Apple Mail) plus its own body content. Every dynamic value interpolated into the HTML
goes through `escapeHtml` first — the same XSS-adjacent reasoning as escaping user content on a web
page, just applied to an HTML email a customer might open in a webmail client. The HTML and
plain-text parts are built independently in each template (not derived from one another), and
every `EmailMessage` always carries both — some inboxes/clients prefer or require the plain-text
part.

Brand colors in the layout match this doc's [Design system](#design-system) table exactly
(`#00A8FF` primary / `#020617` background / `#FFB800` accent), including the same **dark**
foreground on the CTA button (`#020617` text on the `#00A8FF` background) that
[Design system](#design-system) already establishes for `primary`/`accent` — both fail WCAG AA
with white text.

### WhatsApp support (`components/shared/whatsapp-button.tsx`)

One reusable component, `WhatsAppButton` (`components/shared/whatsapp-button.tsx`), backs every
WhatsApp CTA in the app — the Floating WhatsApp button, every "Contact Support" button, and every
order-specific support link. It takes `phoneNumber` as a required prop and never reads one from a
constant itself; `buildWhatsAppUrl`/`buildOrderSupportMessage` (`src/utils/whatsapp.ts`) build the
actual `wa.me` URL and the order-support message text respectively.

**"Configured WhatsApp business number," not hardcoded** — the one real source of truth is
`/admin/settings`' General section (`GeneralSettings.whatsappNumber`, a raw digits string, e.g.
`"8801700000000"`), read via `getPublicSettings()` (the cookie-free, service-role settings read —
see [Site settings](#site-settings-adminsettings)) everywhere a number is needed server-side. Every
call site falls back to `siteConfig.links.whatsapp`'s hardcoded placeholder digits only on a
settings-fetch failure — the same "degrade to the old static default rather than render broken"
pattern `Footer`/`Navbar` already use for other settings fields, not a primary source. A
placeholder is not a real business number either way; replace `siteConfig.links.whatsapp` and the
`/admin/settings` value together before launch.

- **Floating WhatsApp button** — `FloatingWhatsAppButton` (also exported from
  `whatsapp-button.tsx`, a thin preset over `WhatsAppButton` with `variant="floating"`), mounted
  once in `(marketing)/layout.tsx` and once in `(dashboard)/layout.tsx` — both already fetch
  `getPublicSettings()` for `Navbar`/`Footer`, so this reuses that same fetch rather than adding a
  second one. Deliberately **not** mounted in `(admin)/layout.tsx` — staff aren't the audience for
  a customer-support widget on their own backend. Renders nothing (not a dead `wa.me/` link) when
  no number is configured/reachable.
- **Contact Support button** — `Hero`'s CTA (`components/marketing/hero.tsx`). This one is a
  little different: `HomePage` renders `Hero` synchronously, outside any `Suspense`, specifically
  so it paints immediately (see `HomePage`'s own doc comment) — so the button can't just `await
  getPublicSettings()` inline the way every other call site does. Instead `HeroContactSupportButton`
  is its own tiny `async` Server Component, wrapped in its own `<Suspense>` *inside* `Hero`, so only
  that one button streams in separately while the rest of Hero (headline, trust badges, "Browse
  Products") paints immediately. This was previously hardcoded to `siteConfig.links.whatsapp`
  directly; it now reads the configured number the same way every other page does, just via this
  one extra layer to preserve Hero's synchronous-render guarantee.
- **Order-specific support link** — `buildOrderSupportMessage(orderId, storeName)` generates
  *exactly* `"Hello {storeName}, I need help with Order #{orderId.slice(0, 8)}."` — the same short
  order label (`order.id.slice(0, 8)`) used everywhere else in this app (confirmation pages,
  notifications, emails), and **nothing else**. Rendered via `WhatsAppButton` on
  `/checkout/confirmation/[orderId]` (right after order placement, alongside "View my orders") and
  on `/order-tracking`'s result view (`OrderTrackingResultView`, threaded down through
  `OrderTrackingForm` from the page's own `getPublicSettings()` fetch) — `/dashboard/orders`'
  `OrderListItem` deliberately doesn't get its own copy, since its "View details" link already goes
  to `/checkout/confirmation/[orderId]`, which has the button.

**Never extend `buildOrderSupportMessage` (or any other prefilled `wa.me` message in this app) to
include a password, delivery credential, payment method/transaction ID, or any other sensitive
field.** A `wa.me` link's `text` query parameter is plainly visible in the URL itself — shared
links, browser history, referrer headers, screen recordings — never a secure channel. This is
enforced by what the function is given (`orderId`, `storeName`), not by a runtime filter; keep it
that way rather than adding a redaction pass over a richer input later.

### Order tracking (`/order-tracking`)

Deliberately public — no `requireUser()`, not in
`middleware.ts`'s `PROTECTED_PREFIXES`. A customer enters their Order ID
(the full UUID — no shorter reference number exists on `orders`) and the
phone number they used at checkout; `trackOrderAction`
(`src/actions/order-tracking.actions.ts`) → `orderTrackingService.trackOrder`
(`src/services/order-tracking.service.ts`) look it up and return order,
payment, per-product subscription status, and a derived 4-step timeline.

**The order id + phone pair *is* the authorization check, enforced in the
query itself** (`ordersService.getOrderForTracking`'s `.eq("id", ...)
.eq("customer_phone", ...)`), not RLS — there's no session to scope RLS to
for an anonymous visitor, so this runs on the service-role client. This is
safe specifically because the order id is a full UUID (128 bits — only
knowable by someone who already has it, e.g. from the confirmation page),
with the phone number as a second factor on top of that; never add a
phone-only or partial-id lookup path, which would turn this into a way to
enumerate orders. The not-found action error is one fixed generic message
regardless of *which* part didn't match (unknown order id vs. wrong phone
vs. both) — don't let a future edit split that into more specific errors,
or the response itself becomes an oracle for probing which order ids exist.

**The 4-step timeline** (`Order Created` → `Payment Verified` → `Processing`
→ `Delivered`) is derived, not stored — `buildTimeline` in
`order-tracking.service.ts` maps it from `orders.status`/`payments.status`:
`processing`/`completed` order status → the last two steps;
`payments.status = 'verified'` → the second. A rejected payment or a
cancelled order short-circuits into a `"failed"` step state instead of
progressing further — deliberately with no timestamp on that step (only a
hint like "Not completed"), since a timestamp next to a step still labeled
"Payment Verified" reads as confusing, not informative. This exact bug (a
rejection timestamp rendering next to that label) shipped once during
testing and was caught by an actual browser check, not types — if you touch
`buildTimeline`, verify the failed-state branches visually, not just that
they compile.

**Subscription status per line item is a best-effort match, not a
guarantee** — `subscriptions` has no `order_id` (see
[Payment verification & subscriptions](#payment-verification--subscriptions-adminpayments)),
so `trackOrder` matches "the most recently created subscription for this
user + product," which is only unambiguous if the customer hasn't ordered
the same product across multiple orders. Fine for a status display; not
something to build a hard guarantee on without a schema change.

`/checkout/confirmation/[orderId]` links here with `?orderId=` pre-filled
(`OrderTrackingForm`'s `defaultOrderId` prop, read from
`searchParams` in the page) — the phone number still has to be typed, since
that's the actual security check the customer has to provide themselves.

### Customer dashboard (`/dashboard`, `/dashboard/orders`, `/dashboard/subscriptions`, `/dashboard/notifications`, `/dashboard/profile`)

All five pages are Server Components that fetch directly (`ordersService`/
`subscriptionsService`/`notificationsService`/`requireUser()`) — no
client-side loading state, consistent with the rest of this app (the one
piece of client interactivity, `/dashboard/notifications`' mark-as-read/
delete, lives in a client child component driven by the page's
server-fetched initial list — see
[Notification center](#notification-center-notificationbell-in-navbaradminheader-dashboardnotifications)).
`(dashboard)/layout.tsx` now renders `DashboardNav`
(`components/shared/dashboard-nav.tsx`) below `Navbar` — a plain five-link
tab strip (Overview/Orders/Subscriptions/Notifications/Profile), not the
dashboard sidebar shell that's still
[not built](#whats-deliberately-not-built-yet). Don't grow this into a
sidebar in place; if that gets designed later, it likely replaces
`DashboardNav` rather than sitting alongside it.

`/dashboard` and `/dashboard/subscriptions` also call
`notificationsService.syncSubscriptionLifecycleNotifications` on every load
(via `createAdminClient()`, awaited) — see
[Notification center](#notification-center-notificationbell-in-navbaradminheader-dashboardnotifications)
for why this lives here rather than a cron job.

**The expiry warning system reused code that already existed but was
dead** — `getSubscriptionStatus(expiryDate, cancelled)` and
`daysUntilExpiry(expiryDate)` (`src/utils/subscription.ts`) were written in
an earlier pass and never called from anywhere until this feature.
`SubscriptionCard` and the overview page both use
`getSubscriptionStatus` to derive `active`/`expiring_soon`/`expired`
live from `expiry_date`, **not** the stored `subscriptions.status`
column — nothing in this app currently transitions that column on its own
(no cron/scheduled function exists), so trusting it directly would show a
subscription as "active" long after it's actually expired. If a real
expiry-transition job gets built later, `SubscriptionCard`/the overview page
can keep computing this the same way — the derived value should always
either match the stored one or reveal that the job is behind, not be
replaced by blind trust in the column.

**`/dashboard/subscriptions` groups by computed status** (Active/Expiring
Soon/Expired/Cancelled sections via `groupSubscriptionsByStatus`/
`SubscriptionStatusSection`) rather than one flat grid — see
[Subscription lifecycle status](#subscription-management-adminsubscriptions-adminsubscriptionsid)
for the grouping utility and the timezone fix behind `getSubscriptionStatus`
itself. The home overview's compact top-3 preview grid stays flat/ungrouped
on purpose.

**Status badge color mapping is shared, not re-implemented per page** —
`src/constants/status-badges.ts` (`ORDER_STATUS_BADGE_VARIANT`/
`PAYMENT_STATUS_BADGE_VARIANT`/`SUBSCRIPTION_STATUS_BADGE_VARIANT`) is used
by `order-tracking-result.tsx`, `OrderListItem`, and `SubscriptionCard`
alike, extracted from `order-tracking-result.tsx` (which had these maps
defined locally first) specifically because a second consumer showed up
here. Add new statuses/variants there, not as a new local `Record` in
whichever component needs one next.

`/dashboard/orders` doesn't have its own order-detail page — each
`OrderListItem`'s "View details" links to
`/checkout/confirmation/[orderId]`, which is already exactly that (same
RLS-scoped read, same data) for the order's own owner. Don't build a second,
near-identical detail view here.

**`updateProfileAction` (`/dashboard/profile`) runs on the service-role
client, not the caller's session-scoped one — found as a real bug during
testing, not a design choice made up front.** `profiles`' RLS has "view
own" (select) and admin-full-access only; there is **no customer UPDATE
policy at all**. The session-scoped client failed this write silently (a
generic caught error, no useful message) until this was diagnosed by
actually clicking "Save changes" in a browser and checking why nothing
persisted. Same justification as `checkoutService.placeOrder`/
`paymentVerificationService`: `userId` comes only from `requireUser()`, and
`authService.updateProfile`'s `.eq("id", userId)` scopes the write to
exactly that row, so this isn't a privilege-escalation path — just the
only way this write can succeed at all against the current schema. If a
future migration adds a customer "update own" policy on `profiles`, this
could move back to the session-scoped client, but don't assume that policy
exists without checking the migration.

### Product reviews (`/products/[slug]`, `/admin/reviews`)

`reviews` originally shipped with **no moderation at all** — public read,
any customer could insert with just `user_id = auth.uid()` (see the
original `create_reviews.sql`'s own top-of-file comment, which flagged this
as deliberate-for-then: *"if moderation turns out to be needed, that's an
`is_approved` column... to add deliberately later"*). A later migration
(`20260828001500_add_review_moderation.sql`) added that — as a `status`
text enum, **not** the `is_approved` boolean that original comment assumed,
to stay consistent with `orders`/`payments`/`subscriptions` all using a
text status column rather than a boolean flag elsewhere in this schema. The
enum's third value was renamed `rejected` -> `hidden` by the full
moderation-admin-page work
(`supabase/migrations/20260901000400_extend_review_moderation.sql`) — a
better fit for what the action means (taking a review out of public view,
reversibly — see the bidirectional-transition note below) than a
workflow-style "rejection" of a request.

**The verified-buyer rule is enforced by RLS, not just application code.**
`"Reviews: insert own verified buyer"` requires `user_id = auth.uid()` AND
an `exists` subquery joining `order_items`/`orders` for a `completed` order
containing the product being reviewed. `ordersService.hasCompletedOrderForProduct`
(called from `createReviewAction` before ever attempting the insert) is a
**pre-check for a clear error message**, not the actual security boundary —
a bug in that pre-check, or a future write path that skips calling it,
still can't produce an unauthorized review, because RLS would reject the
insert either way. Don't relax the RLS policy to "make it easier" for a new
call site; add the missing pre-check there instead.

**Visibility is three-tiered, matching three RLS `select` policies that are
OR'd together**: `"Reviews: public read approved"` (`status = 'approved'`,
what an anonymous visitor sees), `"Reviews: view own"` (a customer sees
their own review regardless of status — how the product page shows "your
review is pending/rejected" instead of the form once they've already
submitted one), and `"Reviews: staff full access"` (moderation — see
[Admin authorization](#admin-authorization-customermanageradmin) for what
"staff" means here). A customer can only edit their review
(`"Reviews: update own pending"`) while it's still `pending` — once staff
has acted, editing is blocked at the RLS level, not just hidden in the UI.
`reviewsService.listReviewsForProduct`/
`listFeaturedReviews`/`getRatingSummary` all filter `.eq("status",
"approved")` explicitly even though RLS would already enforce it for an
anonymous caller — same "don't rely on RLS alone to also mean don't show
it" reasoning as `productsService.listProducts`'s `status = 'active'`
filter, and specifically needed here because a *signed-in reviewer's own*
session would otherwise leak their own pending review into what's supposed
to be a public-only list.

**No reviewer name is shown publicly** — `Review` (customer-facing)
deliberately has no name field, a product/privacy choice, not a technical
limitation the way it originally was. Every review card just says "Verified
customer". `AdminReview` (admin-only — renamed from `PendingReview` once the
admin list stopped being pending-only, see below) is a different, separate
type that *does* include `reviewerName`/`reviewerEmail`. Don't merge these
two types or reuse `AdminReview` anywhere customer-facing.

**`reviewer_name`/`reviewer_email` are a snapshot taken at submission time
(`reviewsService.createReview`), not a live join to `profiles`** — added by
the same migration as the `hidden` rename, fixing a real, previously-live
bug: the old admin query joined `reviewer:profiles(full_name, email)`
directly, but `profiles` SELECT is `is_admin()`-only while `/admin/reviews`
is `requireStaff()`-gated (admin OR manager, same as every other
operational admin page) — a manager's session got `null` back for every
reviewer's name/email, silently (no error, just empty data), not just a
hypothetical gap. Same "snapshot instead of live join across an RLS gap"
fix already applied to `orders.customer_name`/`subscriptions.customer_name`
elsewhere in this schema — and it's what makes reviewer search possible at
all (`.ilike()` on a real column, not a cross-table join PostgREST's
`.or()` can't reach). The insert itself still runs on the *customer's own*
session client — reading `profiles` for their own `id` is always permitted
by "Profiles: view own" regardless of role, so no RLS gap exists on the
write side.

**`/admin/reviews` is a full filterable/searchable/paginated admin list now,
not a fixed pending-only queue.** `reviewsService.listReviewsForAdmin`
(replacing the old `listPendingReviews`) supports search (reviewer name/
email), a status filter (tabs: All/Pending/Approved/Hidden), and a rating
filter (1–5 stars, `Select`), with the same "fetch `pageSize + 1`, slice,
check `hasMore`" pagination convention as every other admin list.
`AdminReviewTable`/`AdminReviewRowActions` (renamed from
`ReviewModerationTable`/`ReviewRowActions`) call `router.refresh()` on a
successful action, not a local-state row removal — the old component's own
doc comment explained *why* local removal was correct for a table that was
*always* exactly the pending queue (a moderated review genuinely
shouldn't stay); that's no longer true now that the table can show any
status, so it now follows the same full-list-refetch pattern as
`AdminOrderTable`/`AdminCouponTable`.

**Moderation is bidirectional, not single-shot** — `moderateReviewAction`
used to require a review start `pending` and only ever fired once; it now
accepts any `(expectedStatus, status)` pair (`"pending"` excluded as a
*target* by `moderateReviewSchema`'s enum — nothing ever moves a review
backward to "awaiting moderation"), so Approve and Hide both work from
either of the other two states. An admin can hide a review they'd
previously approved, or re-approve one they'd hidden. `expectedStatus`
(the status the client believed the review was in when it rendered the
button) is checked twice — once for a friendly "someone already changed
this" message, once inside `updateReviewStatus`'s guarded
`UPDATE ... WHERE status = expectedStatus`, which is the actual protection
against two staff moderating the same review at once. Verified live: two
concurrent guarded updates against the same review — exactly one succeeded.

**Approve/hide notifies the customer** (`notificationsService.createNotification`,
called from `moderateReviewAction` after the status update — best-effort,
wrapped so a failed notification doesn't fail the moderation decision
itself, same pattern as `paymentVerificationService`). `moderateReviewAction`
runs on the caller's own session-scoped client, not service-role — unlike
`updateProfileAction` above, `reviews`' `"Reviews: staff full access"`
policy already covers this write, so there's no RLS gap forcing a different
client here. Both `moderateReviewAction` and the new `deleteReviewAction`
are `requireStaff()`-gated, not `requireAdmin()` — content moderation, same
category as catalog/order management, not admin-only — see
[Admin authorization](#admin-authorization-customermanageradmin) for why,
and for a real bug this exact call site caused (`createNotification`
silently failing for a manager caller specifically). `deleteReview` needs
no "delete when safe" pre-check the way products/coupons do — nothing else
in the schema references `reviews`, so a delete is always safe; RLS's
`"Reviews: staff full access"` `for all` policy is the real guarantee,
`requireStaff()` is just the application-layer gate in front of it.

`StarRatingInput` (`features/reviews/components/`) is the one interactive
star selector in the app — everywhere else (`ProductRating`, the read-only
side of `ProductReviews`, `Testimonials`, the admin review table) uses the
read-only `StarRating` display instead. Don't reach for the input
component anywhere a rating is just being shown, not collected.

### Admin authorization (customer/manager/admin)

`profiles.role` is a 3-tier model, added by
`supabase/migrations/20260828001600_add_manager_role.sql`: `customer` (the
default), `manager` (operational admin access), `admin` (full access).
`manager` exists specifically so day-to-day work — catalog, orders,
payments, subscriptions, reviews — doesn't require handing out full admin
rights, which cover role management (`/admin/customers`) and site-wide
config (`/admin/coupons`, `/admin/settings`).

**Four helpers in `src/lib/auth/session.ts`, two different jobs.**
`isAdmin(user)`/`isManager(user)` are pure identity checks — exactly
`role === "admin"` / exactly `role === "manager"` (not "admin or manager"),
for conditional UI/logic, never redirect on their own. `requireAdmin()`/
`requireStaff()` are the actual gates — async, redirect unauthenticated
visitors to `/login` and wrong-role visitors to `/forbidden`.
`requireStaff()` passes for `admin` *or* `manager`; `requireAdmin()` passes
for `admin` only. Use `requireStaff()` on operational pages/actions,
`requireAdmin()` on sensitive ones — getting this backwards either locks
managers out of work they should be able to do, or (worse) lets a manager
reach role-management/site-config.

**Enforcement is layered, deliberately redundant — no single layer is
trusted alone:**

1. **`middleware.ts`** — the first check, before any page renders. Beyond
   the existing "is there a session" check for `/admin/*` (unauthenticated
   → `/login?redirectTo=...`), it now also queries the caller's `role` and
   redirects a `customer` straight to `/forbidden`, and further restricts
   `ADMIN_ONLY_PREFIXES` (`/admin/customers`, `/admin/coupons`,
   `/admin/settings`) to `admin` only — a `manager` hitting one of those
   also lands on `/forbidden`, even though they'd pass the general
   `/admin/*` check.
2. **`(admin)/layout.tsx`** calls `requireStaff()` — the baseline every
   page under `(admin)/admin/**` gets for free. This is *not* enough on its
   own for the three admin-only pages — a layout can't gate a subset of its
   own children — so `customers/page.tsx`, `coupons/page.tsx`, and
   `settings/page.tsx` each additionally call `requireAdmin()` themselves,
   the same "layout does the baseline, the specific page does the rest"
   pattern `/checkout` already established for auth in general.
3. **Server Actions** call `requireStaff()`/`requireAdmin()` as their first
   line, matching the page that calls them:
   `updateOrderStatusAction`/`approvePaymentAction`/`rejectPaymentAction`/
   `getPaymentScreenshotUrlAction`/`moderateReviewAction`/
   `createProductAction`/`updateProductAction`/`deleteProductAction` are
   all `requireStaff()`; `updateUserRoleAction` is the one action that
   stays `requireAdmin()` — see below for why that one especially can't
   move.
4. **RLS** — `is_staff()` (new, alongside the existing `is_admin()`) is
   `role in ('admin', 'manager')`, same `language sql stable security
   definer set search_path = public` shape as `is_admin()` so it can read
   `profiles` without recursing into its own RLS. Every operational table's
   `"X: admin full access"` policy was replaced with `"X: staff full
   access"` (`categories`, `products`, `product_variants`, `orders`,
   `order_items`, `payments`, `subscriptions`, `reviews`) — `profiles`,
   `coupons`, `settings` were deliberately left on `is_admin()` alone.
   **This layer is the one that actually matters** — 1-3 are UX (fast
   feedback, no page flash before a redirect), but a request that somehow
   skipped all of them still can't write anything a manager shouldn't be
   able to, because the database itself refuses it. Verified directly, not
   just inferred: a manager's own session signing in and attempting
   `supabase.from("profiles").update({ role: "admin" })` on themselves
   returns zero rows affected — RLS doesn't error on a blocked
   UPDATE/SELECT, it just silently excludes the invisible row, so "no
   error" is *not* the same as "it worked" when checking this by hand.

**`updateUserRoleAction` (`admin.actions.ts`) is the one action that can
never become `requireStaff()`.** It changes `profiles.role`, including to
`'admin'` — a manager with access to this action could grant themselves
full admin rights, which is exactly the privilege escalation the whole
staff/admin split exists to prevent. It also refuses to let anyone change
their *own* role (`parsed.data.userId === currentUser.id` → error), a cheap
guard against an admin accidentally locking themselves out.

**A real bug, not a hypothetical, caught by testing the manager scenario
end to end rather than just confirming the page loads**:
`notificationsService.createNotification` used to `.insert(...).select().single()`
to return the created row. A `manager` calling `moderateReviewAction`/
triggering `paymentVerificationService.approvePayment` (both notify a
*different* user — the reviewer/buyer, not the staff member acting) has an
INSERT-only policy on `notifications` (`"Notifications: staff insert"` —
deliberately narrower than `admin full access`, since a manager creating a
notification for someone else is fine but a manager *reading* arbitrary
users' notifications isn't). The `.select()` after insert needs its own
SELECT policy, which a manager doesn't have — so PostgREST's implicit
insert+select-back transaction failed RLS on the select half and rolled
back the *entire insert*, silently (the call site wraps this in try/catch
as non-fatal, so the payment/review moderation itself still visibly
"succeeded" — only the notification silently never happened). Fixed by
dropping `.select()` entirely (`createNotification` now returns `void`; no
caller used the returned row anyway) rather than widening the manager's
read access to fix a write-path bug. If you add a new caller of
`createNotification` that *does* need the created row back, that's a
signal to reconsider this fix, not just re-add `.select()`.

**`/forbidden` and `/unauthorized`** are two different pages for two
different situations, both under `(marketing)` for consistent chrome.
`/forbidden` (403) is where an *authenticated* visitor with the wrong role
lands — customers and, for admin-only pages, managers too; it reads
`getCurrentUser()` itself to pick a sensible "back" link (staff → admin
dashboard, customer → their dashboard). `/unauthorized` (401) exists for
completeness but isn't part of normal navigation — this app's explicit rule
is that an unauthenticated visitor always gets redirected straight to
`/login` (middleware and `requireUser()` both do this), never shown an
interstitial; `/unauthorized` is there for a future non-page caller (an API
route responding to `fetch`, say) that can't itself issue a redirect. Don't
redirect page navigation to `/unauthorized` — that's not what it's for.

**The service-role key was already never reachable from the browser**
before this — `createAdminClient()` (`lib/supabase/admin.ts`) is guarded by
the `server-only` package (a build-time error if ever imported into client
code) and is only ever called from `"use server"` action files
(`checkout.actions.ts`, `profile.actions.ts`, `payments.actions.ts`,
`order-tracking.actions.ts`, `customers.actions.ts`). Confirmed, not just
assumed, while building this: nothing about the manager role needed to
change that.

### Admin dashboard shell (`components/admin/`)

Every `/admin/*` page renders inside a shell built from four components
(`components/admin/`), composed by one client orchestrator, `AdminShell`,
that `(admin)/layout.tsx` mounts after its `requireStaff()` call:

- **`AdminSidebar`** — fixed desktop `<aside>` (`md:` and up), collapsible
  between full (`w-64`) and icon-only (`w-16`). Collapse state lives in
  `AdminShell` (not the sidebar itself) because the content column's left
  margin has to stay in lockstep with the sidebar's width — split state
  between two components here would drift. Persisted to
  `localStorage["admin-sidebar-collapsed"]`, read back in a `useEffect`
  after mount (not on first render, to avoid a hydration mismatch against
  the server-rendered expanded default).
- **`AdminMobileNav`** — the same nav list in a `Sheet` drawer for below
  `md:`, styled with the `sidebar`/`sidebar-accent`/`sidebar-border` tokens
  (not the default popover ones) so it reads as "the sidebar, mobile
  presentation" rather than a visually distinct menu. Triggered from
  `AdminHeader`'s menu button — it has no trigger of its own.
- **`AdminHeader`** — sticky top bar: mobile nav trigger, `AdminSearch`,
  `NotificationBell` (reused as-is from `Navbar`), and an account menu
  (name/email/role `Badge`, "View storefront", sign out via the existing
  `logoutAction`).
- **`AdminBreadcrumbs`** — derives its trail from `usePathname()` +
  `ADMIN_NAV` (`constants/admin-nav.ts`), not a per-page prop — `/admin/x`
  looks up `x`'s label from the nav config, anything nested beyond that
  falls back to a title-cased slug. No per-route registry to keep in sync.

**`constants/admin-nav.ts`** is the single source of truth for the sidebar
order/icons/hrefs, consumed by all four components above plus `AdminSearch`.
Nav items can be `adminOnly: true` (currently `Customers`, `Coupons`,
`Settings` — the same three pages that call `requireAdmin()` themselves, see
above); `getVisibleAdminNav(role)` filters those out for managers so the
sidebar/drawer/search never link a manager to a page that would just bounce
them to `/forbidden` — a UX consequence of the authorization model, not a
new gate (the real gate is still each page's own `requireAdmin()`/RLS).

**`AdminSearch`** is a quick-nav filter over `ADMIN_NAV`, not a search over
products/orders/customers — there's no cross-entity search backend at this
layer, and a header search box that silently returns nothing for a real
data query would be worse than not having one. It's a controlled combobox
built from `Input` + a manually-positioned listbox (this shadcn preset has
no `Command`/`Popover` primitive) — arrow keys/`Enter` navigate via
`aria-activedescendant`, click-outside closes it.

**Loading/error states** are route-level, not per-component:
`(admin)/admin/loading.tsx` (a `Skeleton` fallback) and
`(admin)/admin/error.tsx` (a Client Component error boundary, same
requirement as the root `error.tsx`) sit in the `admin/` segment folder, so
they apply as the Suspense/error boundary for every nested `/admin/*` route
that doesn't define its own.

`/admin/categories` is staff-accessible, no extra `requireAdmin()` —
categories' RLS already uses `is_staff()`, matching products/orders. It
(along with `/admin/coupons` and `/admin/settings`, both `requireAdmin()`)
started as a placeholder added only because the sidebar needed a real link
to point at, but all three now have full CRUD/config UI — see
[Category management](#category-management-admincategories),
[Coupon management](#coupon-management-admincoupons-and-checkout-discounts),
and [Site settings](#site-settings-adminsettings) respectively.

### Admin dashboard analytics (`/admin/dashboard`)

The dashboard's numbers come from four `security definer` Postgres functions
(`supabase/migrations/20260830000100_add_admin_dashboard_analytics.sql`),
not app-layer `.reduce()` over fetched rows:

- **`admin_dashboard_stats()`** — one row: total revenue, total orders,
  the four order-status counts (pending/processing/completed/cancelled),
  active-subscription count, total customers, pending payments, pending
  reviews. Every headline number on the page in one round trip. No
  expiring/expired subscription counts here — those come from
  `subscriptionsService.getSubscriptionLifecycleCounts` instead (three
  plain queries against `expiry_date`, not this function) — see
  [Subscription lifecycle status](#subscription-management-adminsubscriptions-adminsubscriptionsid)
  for why: this function used to have an `expiring_soon_subscriptions`
  column, removed because it counted a `subscriptions.status` value
  nothing in this app ever actually writes.
- **`admin_revenue_daily(p_days)`** — zero-filled daily revenue for the
  trailing `p_days` days (backs the 7/30/90-day ranges).
- **`admin_revenue_monthly()`** — zero-filled monthly revenue from the
  earliest paid order's month through the current month (backs "All time" —
  daily buckets would be too many points once the store has real history).
- **`admin_top_products(p_limit)`** — best sellers by revenue, one grouped
  query over `order_items`/`orders`/`products`.

All four are `security definer` with an explicit `if not is_staff() then
raise exception ... errcode '42501'` guard at the top, rather than relying
on each underlying table's own RLS to add up to the right access. This
matters concretely for the customer count: `profiles` only grants SELECT to
`is_admin()` (see [Admin authorization](#admin-authorization-customermanageradmin)),
not `is_staff()` — under plain invoker-rights RLS, a manager's own session
would see zero/one row there, even though "how many customers do we have"
is a staff-visible headline number on a page `requireStaff()` (not
`requireAdmin()`) gates. Bypassing RLS here is deliberately narrow — a
handful of aggregate counts/sums, never a row of underlying data — and
gated by the same `is_staff()` check the application layer enforces, the
same reasoning `is_admin()`/`is_staff()` themselves already rely on to read
`profiles` without recursing into their own policy. Verified directly, not
just assumed: a manager session gets correct aggregate numbers, a customer
session calling any of the four RPCs directly gets a `42501` error, not
partial or wrong data.

`adminService.getRevenueSeries()` fires all three `admin_revenue_*` calls
(7d/30d/90d/monthly) in parallel and hands all four ranges to
`RevenueChart` (`features/admin/components/`) at once — the range toggle
(7 days/30 days/90 days/All time) is a local `useState` swap between
already-loaded arrays, not a new server request per click.
`getDashboardStats`/`getRevenueSeries`/`getTopProducts` plus
`ordersService.listRecentOrders`/`paymentsService.listPendingPayments`/
`subscriptionsService.listExpiringSubscriptions` (the latter two gained an
optional `limit` param for this) all run inside one `Promise.all` in the
page — total wall-clock is roughly the slowest single query, not their sum.

Charts (`RevenueChart`, an area chart; `OrderStatusChart`, a donut) use
`recharts`, colored via the existing `--color-chart-1`..`--color-chart-5`
CSS custom properties (already theme-aware light/dark, defined in
`globals.css` for exactly this) rather than hardcoded hex — and
`isAnimationActive={false}` throughout, matching the admin area's
no-excessive-animation convention. `ExpiringSubscriptionsSection` computes
each row's badge with `getSubscriptionStatus`/`daysUntilExpiry`, never
`subscriptions.status` directly, same rule as everywhere else that status
renders (see [Admin authorization](#admin-authorization-customermanageradmin)'s
sibling note and the "Known mismatch" section).

The page wraps its one `Promise.all` fetch in a `try`/`catch` that calls
Next's `unstable_rethrow(error)` before its own `console.error`/fallback
`Alert` — without that, `next build`'s static-generation probe (which
deliberately triggers a `DYNAMIC_SERVER_USAGE` throw for any page using
`cookies()`, expecting the framework itself to catch it) gets swallowed by
this page's own catch block instead and logged as a fake "dashboard failed
to load" error on every build. `unstable_rethrow` lets Next's own
control-flow signals (this one, plus `redirect()`/`notFound()`) pass
through untouched while still catching genuine data-fetch failures.

### Product management (`/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`)

Full CRUD for the catalogue — list with search/category/status filters/sort/
pagination, create, edit, activate/deactivate, and delete, all staff-gated
(`requireStaff()` via the `(admin)` layout, same as every other operational
page — no extra per-page guard needed here).

- **`productsService.listProductsForAdmin`** — every status, not just
  `active` (unlike `listProducts`, the public shop's query). Filters by
  category *id* (the admin toolbar posts an id from a `Select`, not a
  slug the way `/shop`'s filters do) and status, with its own sort set
  (`ADMIN_PRODUCT_SORTS` in `constants/products.ts`) that adds name/
  oldest-first. Pagination follows the exact same "fetch `pageSize + 1`,
  slice, check `hasMore`" convention as `/shop`'s `ShopResults` — no
  `COUNT(*)` query, and the convention lives in the *caller* (the page),
  not the service, matching `listProducts`'s existing contract.
- **`AdminProductToolbar`** is a client component that re-navigates
  `/admin/products` with updated search params on every change (search is
  debounced 400ms via the existing `useDebounce` hook) — it holds no
  product data itself, the Server Component page re-fetches on each
  navigation. Uses shadcn `Select` (not `/shop`'s plain `<select>`+GET-form
  pattern) since the admin toolbar is a single always-visible row, not
  `ShopFilters`' sidebar-vs-drawer split that specifically needs a
  JS-free native form.
- **`AdminProductRowActions`** calls `router.refresh()` after a mutation
  instead of holding a local copy of the list — this is the full
  paginated/filterable list (like `AdminPaymentTable`'s tabbed/filterable
  view — see [Payment verification](#payment-verification--subscriptions-adminpayments)),
  so re-fetching from the server (the action's own `revalidatePath` already
  invalidated the cache) is more correct than a client-held copy that could
  drift from whatever the current filters/page actually match. Every admin
  list in this app follows this same pattern now — the one past exception,
  `ReviewModerationTable`'s local-state row removal for what was then a
  fixed pending-only queue, no longer exists: `/admin/reviews` became a
  full filterable list too (see
  [Product reviews](#product-reviews-productsslug-adminreviews)), and
  `AdminReviewTable` was rebuilt the same way. If you're ever tempted to
  hold a local copy for a "fixed queue" view, confirm it's genuinely
  impossible for that view to grow a status filter/tab later — reviews
  didn't stay that way.
- **Soft delete, not a boolean** — `deleteProductAction` calls
  `productsService.isProductReferenced` (checks `order_items`/
  `subscriptions` for the product id) before deleting, and returns a
  friendly error pointing at deactivation instead of a raw foreign-key
  violation. This is a UX pre-check, not the actual guarantee:
  `order_items.product_id`/`subscriptions.product_id` are both
  `on delete restrict` at the database level (see those tables'
  migrations), so a referenced product literally cannot be hard-deleted
  regardless of this check — the action's catch block also matches
  Postgres's `23503` (foreign-key-violation) error code as a defensive
  fallback for the race where an order lands between the check and the
  delete. "Soft deletion" here is just the existing `status: "archived"`
  value (`products.status` — `draft`/`active`/`archived`) — no separate
  `is_deleted` column.
- **`uploadProductImageAction`** runs on the caller's own session-scoped
  client (staff has RLS insert/update/delete rights on the `product-images`
  bucket — see the migration below), not service-role — there's no
  rollback problem here forcing that the way checkout's multi-table write
  has. Type (`PRODUCT_IMAGE_ALLOWED_TYPES`) and size
  (`PRODUCT_IMAGE_MAX_BYTES`, 5MB) are validated server-side in
  `productsService.uploadProductImage`, never trusting the client's
  `file.type` alone. The storage filename is never derived from the
  client-supplied filename at all — the extension comes from the
  *validated* MIME type, paired with a fresh UUID, so no user input ever
  reaches the storage path (no path-traversal/double-extension surface).
- **`supabase/migrations/20260830000300_add_product_images_bucket.sql`**
  creates the `product-images` bucket with `public = true` — unlike
  `payment-screenshots` (private, service-role-only), product images must
  be readable by anonymous shop visitors, and `next.config.ts`'s
  `images.remotePatterns` already allowlists exactly the
  `/storage/v1/object/public/...` path shape a public bucket serves from.
  Write access (insert/update/delete) is still gated by `is_staff()` — a
  public bucket only affects *read*.
- **`ProductForm`** (`features/products/components/product-form.tsx`) is
  one component for both create and edit (`product?: Product` prop decides
  the mode) — no `variants` field, since neither `createProduct` nor
  `updateProduct` handle variant changes yet (see their doc comments); the
  resolver schema (`productFormSchema` in `features/products/schemas.ts`)
  omits it. Two real bugs were caught building this form, both from the
  same root cause — an HTML form field's raw DOM value doesn't match what
  the Zod schema needs, and the mismatch only shows up for specific inputs:
  - `z.coerce.number()` on `price`/`comparePrice`/`duration` broke
    `zodResolver`'s type inference the same way the review form's `rating`
    field once did (`z.coerce`'s declared *input* type is `unknown`).
    Fixed by keeping the schema fields as plain `z.number()` and having
    `ProductForm` register those three with RHF's `setValueAs` instead, so
    a real `number` (or `undefined` for an empty optional field) reaches
    validation directly.
  - Separately, `shortDescription`/`description` are optional text fields
    with a `.min()` — but an empty `<textarea>`'s DOM value is `""`, not
    `undefined`, and `.optional()` only short-circuits on `undefined`;
    `""` still ran the `.min(10)`/`.min(20)` check and failed as "too
    short." A product created without filling in either field was
    rejected as "Invalid input" with no visible explanation why. Fixed the
    same way as the number fields — `setValueAs: toOptionalText` converts
    an empty/whitespace-only value to `undefined` before validation runs.
  - Also caught: `ProductGalleryUpload` originally called `onChange([...
    value, url])` separately from inside a `Promise.all` over the selected
    files — `value` is captured once when the handler starts, so two
    uploads finishing around the same time both read the same stale array
    and the faster one's URL was silently clobbered by the slower one's
    `onChange`. Selecting 2 gallery images kept only 1. Fixed by awaiting
    every upload first and calling `onChange` exactly once with all
    successful URLs appended.

### Category management (`/admin/categories`)

Full CRUD for categories — search, status filter, sort (no pagination, unlike
products: a subscription marketplace's category count stays small enough
that it isn't needed), create, edit, activate/deactivate, and
delete-with-a-safety-check, all staff-gated the same way products are.

- **`categories` had no status column at all before this** — the table's
  original migration comment explicitly notes `is_active` was dropped from
  an earlier revision ("no way to hide one without deleting it"). It comes
  back via `supabase/migrations/20260830000400_add_category_status_and_images_bucket.sql`
  as a two-value text `status` (`active`/`inactive`), matching this
  schema's established text-status convention elsewhere — not a boolean,
  and not `products.status`'s three-value `draft`/`active`/`archived`
  (categories have no "draft" concept). The same migration narrows
  `"Categories: public read"` to `status = 'active'` only — staff still see
  every status via the existing `"Categories: staff full access"` policy.
- **`categoriesService.listCategories` (the public-facing function used by
  `/shop`, `/categories`, `/category/[slug]`, and the homepage's
  `CategoriesSection`) now explicitly filters `status = 'active'`** — not
  just relying on the new RLS policy. A *staff* session browsing the public
  site would otherwise also match the broader "staff full access" policy
  (permissive policies OR together) and see inactive categories mixed into
  public listings; filtering explicitly keeps this function's result the
  same regardless of who's calling it. `productsService.listProducts`
  already does the same thing for the identical reason.
  **`listCategoriesForAdmin`** (new, admin-only — search/status/sort, every
  status) is what the category management page and the three admin product
  pages' category `Select` use instead — a product already assigned to a
  since-deactivated category must still show that category selected, not
  silently lose the option.
- **Create/edit is a `Modal`, not a separate route** — unlike
  `ProductForm` (a full page, `/admin/products/new` and
  `/admin/products/[id]/edit`), `CategoryFormDialog` wraps `CategoryForm` in
  the existing `Modal` convenience component. Five simple fields and one
  image (no gallery, no variants) didn't justify two new routes the way
  products' considerably larger form did; the same `CategoryForm` instance
  handles both create (no `category` prop) and edit (`category` prop
  pre-fills it), closing itself via an `onSuccess` callback rather than
  navigating away.
- **Unsafe deletion is prevented at the application layer, not the
  database** — this is the one place that differs from products' delete
  safety. `order_items.product_id`/`subscriptions.product_id` are `on
  delete restrict`, so the database itself blocks a referenced product's
  hard delete regardless of any app-layer check. `products.category_id` is
  `on delete set null` (see that column's own migration) — the database
  would happily null out every assigned product's category and let a
  category delete through. `categoriesService.isCategoryReferenced` (checks
  for any product with that `category_id`) is what actually prevents
  "unsafe deletion" here, not a database constraint;
  `deleteCategoryAction` returns a friendly error steering an admin toward
  deactivating instead, with no `23503` fallback in the catch block the way
  `deleteProductAction` has, since there's no FK constraint that could ever
  raise one.
- **`category-images`** is a second public Storage bucket, created by the
  same migration, mirroring `product-images`'
  (`20260830000300_add_product_images_bucket.sql`) bucket/RLS shape
  exactly — public read, `is_staff()`-gated writes.
  `categoriesService.uploadCategoryImage`/`CategoryImageUpload` are
  deliberately separate, near-identical copies of
  `productsService.uploadProductImage`/`ProductImageUpload` rather than a
  shared abstraction — only the validation *constants* were extracted
  (`constants/images.ts`'s `IMAGE_ALLOWED_TYPES`/`IMAGE_MAX_BYTES`/
  `IMAGE_EXTENSION`, pulled out of `constants/products.ts` where they'd
  originally been added and now shared by both domains); the upload
  service functions and client components stayed duplicated on purpose,
  to avoid touching the already-shipped, already-tested product management
  code for a category feature that didn't need to change it.
- **`CategoryForm` proactively applied `ProductForm`'s `setValueAs` fix**
  for the optional `description` field (an empty `<textarea>`'s DOM value
  is `""`, not `undefined`, so `.optional()` alone doesn't stop `.min(10)`
  from failing it) — this bug was found once already building `ProductForm`
  and didn't need rediscovering here; see
  [Product management](#product-management-adminproducts-adminproductsnew-adminproductsidedit)'s
  notes for the original repro.

### Order management (`/admin/orders`, `/admin/orders/[id]`)

Full order lifecycle management — search/filter list, a detail page with
customer/items/payment/timeline/subscription panels, and the four
fulfillment actions (approve/reject payment, mark processing, mark
completed, cancel), all staff-gated and server-validated.

- **The 5-way list filter (`AdminOrderFilterStatus` in `constants/orders.ts`)
  is not the raw `orders.status` enum.** Every order starts
  `status: "pending"`, and `status` only ever moves *forward* — payment
  approval/rejection only touches `payment_status`, never `status` itself.
  That means a huge share of an order's life is spent at
  `status: "pending"` in two very different real states: freshly placed,
  genuinely awaiting payment review (`payment_status: "pending"`), or
  payment already resolved one way or another but fulfillment hasn't been
  progressed yet. `utils/order-status.ts`'s `getAdminOrderFilterStatus`
  splits "Payment Review" out of "Pending" along exactly that line — see
  its doc comment for the full reasoning. `listOrdersForAdmin` translates a
  filter tab click into the matching `status`/`payment_status` `WHERE`
  clause; there's no stored computed-status column.
- **`utils/order-status.ts` is the single source of truth for valid status
  transitions**, imported by both `OrderStatusActions` (which action
  buttons to render) and `ordersService.changeOrderStatus` (the actual
  server-side guard) — the UI never has its own separate notion of "what's
  allowed" that could drift from what the server enforces.
  `ORDER_STATUS_TRANSITIONS` encodes the shape (`pending` →
  `processing`/`completed`/`cancelled`; `processing` →
  `completed`/`cancelled`; `completed`/`cancelled` are terminal — nothing
  transitions backward), and `REQUIRES_PAID_PAYMENT` additionally blocks
  moving *into* `processing`/`completed` unless `payment_status === "paid"`
  — an order can't start or finish fulfillment on a payment that's still
  unreviewed or was rejected. Cancelling has no such requirement. Verified
  directly, not just by code review: a manager session was driven through
  every transition end to end, including confirming the UI renders no
  action buttons at all for a terminal order and none of
  `processing`/`completed` for an order whose payment isn't yet verified.
- **`order_activity`** (`supabase/migrations/20260830000500_add_order_activity.sql`,
  refined by `20260831000100_refine_order_activity.sql`, extended by
  `20260901000200_add_coupon_management.sql`) is the append-only
  history backing "Order timeline" — `id`/`order_id`/`actor_id`/
  `actor_name`/`action`/`old_status`/`new_status`/`note`/`created_at`, one
  row per lifecycle event: `order_created`, `payment_submitted`,
  `payment_approved`, `payment_rejected`, `order_processing`,
  `subscription_delivered`, `order_completed`, `order_cancelled`,
  `coupon_applied` — nine specific actions, not one generic "status
  changed." `coupon_applied` is logged from inside `redeem_coupon()`
  itself, not a separate JS call — see
  [Coupon management](#coupon-management-admincoupons-and-checkout-discounts).
  Written by
  `ordersService.createOrder`/`changeOrderStatus` (order_created and the
  three fulfillment transitions — `STATUS_CHANGE_ACTION` in
  `orders.service.ts` maps `nextStatus` to the specific action name),
  `checkoutService.placeOrder` (payment_submitted, right after the
  `payments` row is created), and
  `paymentVerificationService.approvePayment`/`rejectPayment`
  (subscription_delivered — one entry per order even when multiple
  products/subscriptions are provisioned, not one per product — and
  payment_approved/payment_rejected) — never by the UI directly.
  `actor_name` is a **snapshot at write time, not a live join to
  `profiles`** — a manager viewing a timeline entry performed by an admin
  would otherwise hit the same gap `admin_dashboard_stats()` was built
  around (`profiles`' SELECT policy is "view own" + `is_admin()`-only, not
  `is_staff()`), so a nested `profiles(full_name)` select would silently
  come back null for any actor who isn't the viewer or an admin. `null` for
  `order_created`/`payment_submitted` — both are customer-triggered, no
  staff actor to attribute them to.
  **Staff-only RLS** — no customer-readable policy on this table at all
  (the refinement migration dropped the "view own" policy the first
  version shipped with); an audit trail of admin actions has no reason to
  be customer-readable the way `orders`/`payments`/`subscriptions`
  themselves are. Every customer-facing order surface
  (`/dashboard/orders`, `/checkout/confirmation/[orderId]`,
  `/order-tracking`) reads `orders.status`/`payment_status` directly and
  has never queried `order_activity` — verified by grep, not assumed —
  so this table only exists behind `/admin/orders/[id]`, itself gated by
  `requireStaff()`.
- **`OrderSubscriptionsCard`'s "Subscription information" is best-effort,
  not a real order→subscription link** — `subscriptions` has no `order_id`
  column at all (see that table's migration comment), so the detail page
  matches the customer's subscriptions to this order by product id only.
  If the same customer bought the same product in a different order too,
  this shows their *current* subscription state for that product, which
  may have been created or renewed by that other order instead. The card
  says so explicitly rather than implying a precision the schema can't
  back up.
- **Search matches a full order id exactly, or a partial customer name/
  email/phone match** — order ids are random UUIDs, so a partial match
  isn't worth supporting (nobody types half a UUID). The customer-fields
  branch runs through `escapeOrFilterValue`
  (`orders.service.ts`) before reaching `.or()` — PostgREST's `.or()`
  filter argument is a small textual DSL (commas separate conditions), so
  interpolating a raw, unescaped search term into it wouldn't just fail to
  match on a comma — it could inject an unrelated extra filter condition.
  Wrapping the value in double quotes (PostgREST's documented escape) is
  what a search term containing `,`/`.`/`(`/`)` needs to stay *just* a
  search term.
- **Confirmation is required for "Mark completed"/"Cancel order"/"Approve
  payment"/"Reject payment"**, not "Mark processing" — finalizing
  fulfillment, cancelling, and the two payment-verification actions are
  the genuinely sensitive, hard-to-casually-undo ones; moving an already-
  paid order into "processing" is a low-stakes intermediate step (easily
  corrected by another status change) that doesn't need a modal in the
  way.
- **Order status changes don't send the customer a notification** — unlike
  payment approval/rejection (which already did, from the earlier payment
  verification work), "Mark processing"/"Mark completed"/"Cancel order"
  have no customer-facing notification. Not an oversight: the task this
  was built against didn't ask for one, and the admin action buttons say
  so in their confirmation copy rather than implying it happens.

### Customer management (`/admin/customers`, `/admin/customers/[id]`)

`requireAdmin()`, not `requireStaff()` — this is the same admin-only page
[Admin authorization](#admin-authorization-customermanageradmin) already
names as the reason `/admin/customers` exists (role management via the
pre-existing `updateUserRoleAction`), so both the list and detail page call
`requireAdmin()` themselves on top of the `(admin)` layout's `requireStaff()`
baseline, and `middleware.ts`'s `ADMIN_ONLY_PREFIXES` already blocks a
manager at the edge before either page even renders. Lists **every**
`profiles` row regardless of role (not just `role = 'customer'`) — there's
no separate staff-management page in this app, and the account-disable
feature below is equally meaningful for a manager's account as a
customer's.

**No new `security definer` RPC anywhere in this feature** — unlike
subscriptions/payments/dashboard-analytics, which all need one because a
*manager's* session can't read `profiles` (`is_admin()`-only SELECT).
`/admin/customers` is `requireAdmin()`-only, so the calling session always
already satisfies `is_admin()`, and `profiles`' existing "admin full access"
RLS policy — plus `orders`/`subscriptions`' `is_staff()` policies, which
`is_admin()` also satisfies — already grant that session everything the
list, search, and per-customer stats need. `customersService
.listCustomersForAdmin`/`getCustomerStats` are both plain queries on the
caller's own session client.

**Search** (`listCustomersForAdmin`) covers `full_name`/`email`/`phone` —
all real columns on `profiles` directly, no join, via the same
`escapeOrFilterValue`-guarded `.or()` pattern as `orders.service.ts`/
`subscriptions.service.ts`. **Filter** is account status (Active/Disabled),
not role — a role filter would imply role-*management* UI (promote/demote
buttons) this feature deliberately doesn't add; `updateUserRoleAction`
already exists from earlier work and this page displays each row's role as
a read-only badge, but doesn't wire up new UI to change it (out of this
task's scope, and changing that is a separate, already-solved problem).

**Per-customer stats** (`getCustomerStats`) fetch that one customer's
orders/subscriptions and reduce in JS, not a SQL aggregate — deliberately
different from `admin_dashboard_stats()`, whose own header comment explains
*why it* avoids "fetch every row and reduce in JS" (a full-table scan
across the *entire store's* orders). One customer's history is naturally
small, so that concern doesn't apply, and this way "Expired Subscriptions"
can reuse `getSubscriptionStatus` directly instead of re-deriving its
date-comparison logic in SQL. "Total Spending" matches
`admin_dashboard_stats()`'s `total_revenue` definition exactly — sum of
`total_amount` where `payment_status = 'paid'` only, not every order
regardless of status; "Total Orders" is the unfiltered count, same
paid-vs-unfiltered split the dashboard's own stats keep.

**"View orders"/"View subscriptions"** aren't new pages — they're plain
links to `/admin/orders?search=<email>`/`/admin/subscriptions?search=<email>`,
reusing each list's existing search rather than building a third way to
query the same data. **"Create subscription"** reuses `subscriptions`'
`CreateSubscriptionModal` as-is, with a new optional `defaultCustomerEmail`
prop that pre-fills *and disables* the email field (the customer is already
known from the page you're on — no reason to let it be retyped).

**"Disable account" is enforced three ways, not just a display flag:**
1. `profiles.disabled` (new column,
   `supabase/migrations/20260901000100_add_customer_management.sql`) — a
   fast, RLS-readable mirror used for listing/filtering/badges, the same
   "snapshot for cheap reads" reasoning as `orders.customer_name`/
   `subscriptions.customer_name` elsewhere in this schema.
2. `auth.admin.updateUserById(id, { ban_duration })` — the actual Supabase
   Auth ban, which blocks *future* sign-ins. This is the one operation in
   the whole feature that needs the service-role client
   (`createAdminClient()`, only ever in `customers.actions.ts`); GoTrue's
   admin API has no session-scoped equivalent, unlike everything else this
   feature touches.
3. **`getCurrentUser()` itself now checks `profile?.disabled` and returns
   `null` if set** — a ban alone only stops a *future* sign-in; an
   already-issued access token stays valid until it expires or refreshes,
   since PostgREST/RLS verify the JWT locally rather than calling back to
   GoTrue per request. Because `getCurrentUser()` re-fetches `profiles` on
   *every* request with no caching, this closes that gap immediately —
   a disabled user's very next page load or Server Action call reads as
   "signed out," not just their next login attempt. Verified live: disabling
   an account mid-session, then attempting to sign back in with the same
   credentials, fails immediately.

`customersService.setCustomerDisabled(db, ...)` performs both writes 1 and 2
on the same client (must be the admin client, passed in by the action —
services never create their own client). **"Where appropriate"**:
`setCustomerDisabledAction` refuses to disable the caller's own account
(same self-guard `updateUserRoleAction` already uses) and refuses to
disable *any* `admin`-role account outright, not just the caller's own — so
one admin can never lock out another. Both guards only apply when
*disabling*; re-enabling any account is always allowed. The page computes
`canDisable` itself (same self/admin check) so the button never appears
where the action would just reject it.

**"Do not expose sensitive Supabase authentication data"**: `Customer`
(`types/customer.ts`) only ever carries fields already mirrored onto
`profiles` — `id`/`email`/`fullName`/`phone`/`avatarUrl`/`role`/`disabled`/
`createdAt`. No code path in this feature reads back a raw
`auth.admin.getUserById()`/`listUsers()` response and passes it to a page
or action result — `auth.admin.updateUserById` is called write-only, its
response discarded beyond the error check. If a future feature needs to
display something from Supabase Auth that isn't already on `profiles`, map
it into an explicit, narrow field on `Customer` rather than passing a raw
`User` object through — that object carries `identities`,
`app_metadata`/`user_metadata`, `banned_until`, and other fields this page
has no reason to ever render.

### Site settings (`/admin/settings`)

`requireAdmin()`, not `requireStaff()` — site-wide config, same category as
coupons (direct brand/revenue impact). Five independent sections/forms
(General/Payment/Delivery/SEO/Social), each its own `Card` with its own
save button — `GeneralSettingsForm`/`PaymentSettingsForm`/
`DeliverySettingsForm`/`SeoSettingsForm`/`SocialSettingsForm`
(`features/settings/components/`), each calling its own action
(`updateGeneralSettingsAction`, etc., `actions/settings.actions.ts`).

**`settings` (`key text unique, value jsonb`) already existed** — a
key-value table, originally seeded for nothing in particular (its own
migration comment: "e.g. maintenance mode, feature flags"). This feature
is its first real use: one row per section (`key = 'general'`/`'payment'`/
`'delivery'`/`'seo'`/`'social'`), each holding that section's fields as one
JSON object — `settingsService.getSettings`/`updateSettingsSection` are a
thin key-value read/upsert layer over it
(`supabase/migrations/20260901000500_seed_settings.sql` seeds the five rows
with the values that used to be hardcoded in `src/constants/site.ts`, so
shipping this didn't change the live site's behavior on its own).

**"Sensitive settings must not be exposed to unauthorized users" / "use
appropriate database access policies" is satisfied by *not* relaxing
`settings`' existing RLS at all** — it stays `"Settings: admin full
access"`, `for all`, no public/customer policy, exactly as that table's
original migration already had it (and explicitly recommended staying:
*"if a future feature needs one setting exposed publicly... a narrowly-
scoped public policy or RPC over specific keys, not a blanket public read
of this whole table"*). None of the five sections' fields are secret —
they're all things already displayed publicly today (store name, contact
info, payment numbers already shown at checkout, social links, SEO copy) —
but the *table* still isn't public-readable. Public pages that need to
*display* a setting read it server-side via `getPublicSettings()`
(`src/lib/settings.ts`), which wraps `createAdminClient()` — the
service-role client bypasses RLS for this narrow, read-only, non-user-
specific purpose, and (unlike `createServerSupabaseClient()`) never calls
`cookies()`, which is what makes it safe to call from `MarketingLayout`,
the shared layout wrapping `/category/[slug]`, the one statically-
generated page in this app; a `cookies()`-using fetch there would have
silently broken its static generation the same way that page's own note
already warns about. Verified live: `/category/[slug]` stays in the
`next build` output's static-page list after this feature shipped. Also
verified live, directly against Postgres (not just inferred from the RLS
policy text): neither an anonymous session nor a signed-in *customer's*
own session can read a single row from `settings` — both come back empty,
not an error.

**"Do not store secrets such as API keys... secrets must remain
environment variables"**: enforced by scope discipline, not a technical
guard — `settingsService.getSettings`'s doc comment states this
explicitly as a durable constraint for future contributors. The five
sections here are deliberately business/display config only; a future
temptation to add a payment-gateway API key or webhook secret as a
"setting" (because the admin-editable form is *right there*) should go to
`src/lib/env.ts` instead, the same place the app's four real secrets
already live.

**Real call sites were rewired to read live settings, not just save-and-
display-back-in-the-admin-form**: `MarketingLayout` fetches once and
passes `storeName`/`settings` down to `Navbar`/`Footer`; `Footer` also
shows support hours (Delivery) and social links, generic `Globe` icons for
Facebook/Instagram/YouTube since lucide-react ships no brand marks (same
gap `PaymentMethodsList` already documents for bKash/Nagad/Rocket) plus a
real `MessageCircle` icon for WhatsApp; the root layout and homepage
convert their `export const metadata` to `generateMetadata()` for SEO
section title/description/OG image (this doesn't affect the homepage's
own "Hero paints immediately, no data dependency" design — metadata
resolution is a separate phase from the page body's own streaming, so
`generateMetadata` becoming async doesn't block `HomePage`'s Suspense
boundaries); `/checkout` fetches Payment section numbers and threads them
through `CheckoutForm` -> `PaymentMethodSelector` (a client component with
no data access of its own); the product detail page fetches
`general.whatsappNumber` for `ProductPurchasePanel`'s "Buy Now" CTA, via
the shared `utils/whatsapp.ts` `buildWhatsAppUrl` helper. **Deliberately
NOT rewired**: `Hero`'s own WhatsApp CTA stays on the `siteConfig`
constant — threading a settings fetch through the top-level `HomePage`
component for Hero's sake would force the whole page to wait on that
fetch before anything paints, undermining the exact "static sections paint
immediately" property that page's own doc comment establishes; low-value
branding-only `siteConfig.name` reads (admin sidebar/mobile-nav, auth
card, category FAQ copy) were left alone too — see
`getPublicSettings`'s doc comment before adding a new settings-dependent
read to a component that's supposed to render without a data dependency.

`src/constants/site.ts`'s `siteConfig` still exists — now purely as the
last-resort fallback every read-site above falls back to on a fetch
failure, plus the source for the two fields that were never settings
material to begin with (`currency`, used in product-page JSON-LD; `url`,
which is just `NEXT_PUBLIC_SITE_URL`). Don't delete it; a settings-table
outage should degrade to the old static site, not an empty one.

### Image optimization

`next.config.ts`'s `images.remotePatterns` allowlists `*.supabase.co/storage/v1/object/public/**`
— a wildcard for any Supabase project's public Storage bucket, since no real
project is connected yet to hardcode a specific ref. `next/image` refuses to
load from any host not in this list, so **adding a different image host
later (a CDN, an upload service) needs a new `remotePatterns` entry here
first**, or every image from it will 400. `ProductCard`, `CategoryCard`,
`CategoryBanner`, `ProductGallery`, and `CartSheet`'s line-item thumbnails
all use `next/image` (`fill` inside a `relative`-positioned, aspect-ratio-
constrained container for anything responsive; fixed `width`/`height` for
the small fixed-size ones like `CategoryCard`'s icon slot) — none of this
project's product/category images have gone through anything but a plain
`<img>` before now.

### `src/services/<domain>.service.ts`

Data-access functions. Each one takes a Supabase client as its **first
argument** (`DbClient`, from `src/services/types.ts`) instead of constructing
one internally:

```ts
export async function listOrdersForUser(db: DbClient, userId: string) { ... }
```

This is the one deliberate architectural rule worth calling out: it keeps
services agnostic of *which* client the caller needs (anon/session-scoped vs.
service-role/admin — see [Supabase clients](#supabase-clients-srclibsupabase)),
and it means a service function is a plain testable function, not a hidden
dependency on `cookies()`/request context.

`products.service.ts`'s `listProducts(db, filters, options)` takes filters
(`categorySlug`, `search`, `minPrice`/`maxPrice`, `sort`) and pagination
(`options.limit`/`options.offset`, separate from filters — pagination isn't
a filter) as two distinct params, both optional — `listProducts(db)` alone
still works (used by the admin products count). `getProductById` sits
alongside `getProductBySlug`: the public site always resolves by slug, but a
primary-key lookup is the kind of thing a data-access layer should just
have.

`categories.service.ts` and `reviews.service.ts` don't map onto one of the
ten business domains one-to-one — `categories` supports `products` (no
`features/categories/` or `actions/categories.actions.ts`; categories are
read-only from the app's perspective so far, managed directly in Supabase),
and `reviews.service.ts` is read-only until a review-submission form exists.
Add the matching `features/`/`actions/` files when either needs writes from
the app itself.

### `src/actions/<domain>.actions.ts`

Next.js Server Actions (`"use server"`). Kept intentionally thin — the only
things an action should do are: check auth (`requireUser`/`requireAdmin`),
parse/validate input against a `features/<domain>` schema, call one or more
service functions, `revalidatePath` the affected routes, and return an
`ActionResult` (see `src/types/api.ts`). Business logic belongs in
`services/`, not here.

### `src/lib/supabase/`

Five different Supabase clients for five different execution contexts —
using the wrong one is the most common Supabase+Next.js mistake, so each is
named for exactly where it's allowed to run:

- **`client.ts`** — browser client. Client Components only.
- **`server.ts`** — Server Components, Server Actions, Route Handlers. Reads
  the session from cookies via `next/headers`.
- **`middleware.ts`** — used by `src/middleware.ts` to refresh the session
  cookie on every request (Server Components can only *read* cookies, so
  something has to *write* the refreshed one — that's this).
- **`admin.ts`** — service-role client, bypasses Row Level Security.
  Server-only (guarded with the `server-only` package), for admin operations
  and `checkoutService.placeOrder` (needs to roll back its own writes on a
  partial failure — see [Checkout](#checkout-checkout-checkoutconfirmationorderid)
  for why that specifically needs service-role, not just "a service-layer
  write"). Never import this from a Client Component.
- **`static.ts`** — anon-key client, no cookies at all. For public data
  fetching that must not be forced into dynamic rendering —
  `generateStaticParams` and statically-generated public pages (currently
  `/category/[slug]` — see below). `server.ts`'s `cookies()` call alone
  marks a route dynamic regardless of whether the page needs the session;
  this sidesteps that. Only reach for it on a page with genuinely no
  user-specific content — it has no session to read, so anything gated on
  the signed-in user needs `server.ts` instead. Its `fetch` is wrapped with a
  15s timeout + 3 attempts (`resilientFetch` in the same file): `next
  build`'s static-generation worker gives each page one ~60s budget across
  all retries, and a single stalled connection to Supabase can burn that
  whole budget with no chance to recover — seen in practice as `/category/
  streaming` reliably timing out at exactly 60s×3 during a real build
  against a live project, while the same query run standalone completed in
  under 2s. Client-side timeout+retry turns one hung request into a fast
  retry instead of a dead page.

### `src/lib/auth/session.ts`

`getCurrentUser()`, `requireUser()`, `requireAdmin()` — the server-side
session helpers every protected layout and admin action uses. `requireUser`
redirects to `/login`; `requireAdmin` redirects non-admins to `/dashboard`.

`getCurrentUser` reads role/profile fields from `profiles` — that table and
its `handle_new_user` trigger now exist as a migration
(`supabase/migrations/20260828000200_create_profiles.sql`, see
[Database schema](#database-schema-supabase)) but aren't applied to a real
Supabase project yet, so this still throws until they are.

### Client-side auth state — `AuthProvider` / `useAuth`

Server Components get identity via `requireUser`/`getCurrentUser` above.
Client Components that need to react to sign-in/sign-out (e.g. an avatar
menu that swaps for a "Sign in" button) use `useAuth()`
(`src/hooks/use-auth.ts`) instead:

```tsx
"use client";
const { user, session, isLoading } = useAuth();
```

`AuthProvider` (`src/components/providers/auth-provider.tsx`) is mounted
once, app-wide, in `components/providers/index.tsx`. It opens a single
Supabase `onAuthStateChange` subscription and republishes it through React
context — `useAuth` just reads that context, so every consumer shares one
subscription instead of each opening its own. It throws if called outside
the provider (which never happens in practice — `Providers` wraps the whole
tree in `app/layout.tsx`).

This hook is **UI state only** — it never gates access to a route or an
action. It's deliberately client-only (no server-fetched initial user
passed down from `layout.tsx`) so the public marketing/auth pages keep
prerendering statically (`○` in the build output) instead of every route
being forced dynamic by a `cookies()` call at the root. The brief flash
between "not authenticated" and the real state on first paint
(`isLoading`) is the accepted tradeoff for that — render a skeleton/nothing
while `isLoading` is true rather than assuming signed-out.

Route protection itself is enforced twice, both server-side, independent of
this hook:

1. **`src/middleware.ts`** — redirects unauthenticated requests to
   `/dashboard/*` or `/admin/*` to `/login?redirectTo=<path>` before any
   page renders (and bounces already-signed-in users away from
   `/login`/`/register`/`/forgot-password`).
2. **`requireUser`/`requireAdmin`** in each protected route group's
   `layout.tsx` — the authoritative check, in case middleware's prefix
   matching is ever wrong.

### `src/types/database.types.ts`

Placeholder for Supabase's generated schema types. Regenerate once the
schema exists:

```
npx supabase gen types typescript --project-id <project-id> --schema public > src/types/database.types.ts
```

Until then, `DbClient` (`src/services/types.ts`) is intentionally an
**untyped** `SupabaseClient` — a loose `Record<string, any>` placeholder
looks safer but actually makes every `.select("a, b, c")` call silently
resolve to `{}`, which fails at every call site instead of being visibly
untyped. Don't "fix" this by widening the placeholder; regenerate the real
file instead. Hand-written domain types in `src/types/*.ts` (`Product`,
`Order`, `Subscription`, ...) are what service functions cast/shape their
results into in the meantime.

## Technical SEO

Three files anchor this: `src/lib/seo.ts` (per-page `Metadata` — title/description/
canonical/OG/Twitter), `src/lib/json-ld.ts` (structured-data builders), and
`components/shared/json-ld.tsx`/`components/shared/breadcrumbs.tsx` (the
render layer). Every indexable page's `generateMetadata` should go through
`buildMetadata`, not hand-assemble a `Metadata` object — see that
function's own doc comment for why (drift between canonical and
`openGraph.url` is the specific failure mode it prevents).

### `lib/seo.ts` — `buildMetadata`, canonicals, `NOINDEX_ROBOTS`

`buildMetadata({ title, description, path, image?, noIndex? })` returns
title, description, a self-referencing `alternates.canonical`, a matching
`openGraph` object (siteName/type/locale from `siteConfig`, or a caller
override), and a `twitter` card — all from the same handful of inputs.
`path` is always site-relative; `absoluteUrl(path)` (also exported) is what
resolves it against `siteConfig.url` for `openGraph.url`/JSON-LD `url`
fields. `NOINDEX_ROBOTS` (`{ index: false, follow: false }`) is the one
constant every non-public route uses — see below for where.

**Root layout defaults** (`src/app/layout.tsx`) supply `metadataBase`,
canonical `/`, and a full `openGraph`/`twitter` object sourced from
`/admin/settings`' SEO section — every child route that doesn't override a
given field inherits it (Next's metadata merging is per-field, not
all-or-nothing), which is what makes the noindex-by-layout pattern below
work with zero per-page changes.

**"Every important public page must have unique metadata"** — `/`,
`/shop` (+ one canonical per category filter, see below), `/categories`,
every `/category/[slug]`, and every `/products/[slug]` each build their own
title/description/canonical from live data (`buildMetadata`), not a shared
static string. The homepage is the one deliberate exception to "just pass
a plain string `title`": its title already contains the brand name
(`"{storeName} — Premium Digital Subscriptions"`), so it overrides
`buildMetadata`'s result with `title: { absolute: title }` to bypass the
root layout's `%s | {brand}` template — otherwise the brand name would be
appended a second time. No other page does this; every other page's title
is deliberately just its own short name/label and lets the template add
the brand suffix.

**"Prevent duplicate canonical URLs"** — `buildShopCanonicalPath(categorySlug)`
is what makes this concrete for `/shop`, the one page with enough query
params to otherwise fan out into many indexable-looking near-duplicates:
`search`/`sort`/`page` never appear in a canonical (they don't represent
meaningfully different content — search results are input-dependent, a
sort order is a re-ordering of the same items, pagination should
consolidate rather than fan out into N separate indexable pages), while
`category` does (a genuinely different, worth-indexing item set). Every
filter combination against the same category therefore converges on
exactly one canonical URL — `/shop` bare, or `/shop?category=<slug>`.
Every other page already had (or now has) a single, self-referencing
canonical with no query-string variability to worry about.

**Noindex coverage** — two layers, deliberately both:
- `(admin)/layout.tsx`, `(dashboard)/layout.tsx`, `(auth)/layout.tsx` each
  export `metadata = { robots: NOINDEX_ROBOTS }`, which every page under
  them inherits automatically (none of those ~30 pages set their own
  `robots`, so nothing overrides it) — this is *why* only three files were
  touched to cover all of `/admin/*`, `/dashboard/*`, `/login`,
  `/register`, `/forgot-password`, instead of every individual page.
  `(marketing)/layout.tsx` deliberately has no such default (it also wraps
  the genuinely indexable pages), so `/cart`, `/checkout`,
  `/checkout/confirmation/[orderId]`, `/order-tracking`, `/unauthorized`,
  and `/forbidden` each set `robots: NOINDEX_ROBOTS` individually instead.
- `/products/[slug]` and `/category/[slug]` return
  `{ robots: NOINDEX_ROBOTS }` (not `{}`) from `generateMetadata` when the
  slug doesn't resolve, so a bad/removed slug never briefly inherits the
  parent's indexable defaults before `notFound()` renders.
  `/category/[slug]` additionally sets `noIndex: category.status !== "active"`
  even when the category *is* found — `categoriesService.getCategoryBySlug`
  doesn't filter `status` (unlike `getProductBySlug`, which does), so a
  deactivated category is still reachable by direct link. Making it
  non-indexable is the SEO-layer fix; whether it should also 404/be
  otherwise inaccessible is a separate access-control decision this task
  deliberately left alone.
- **Known limitation, not fixed by this system**: calling `notFound()` in
  `/products/[slug]`/`/category/[slug]` renders the right content (the
  `not-found.tsx` boundary) but the HTTP response status is `200`, not
  `404`, under `next start` in this environment — verified directly, not
  assumed, and confirmed to also affect a plain unmatched dynamic segment
  on `/category/[slug]`, so it's a pre-existing framework/runtime
  characteristic of this app, not something introduced by (or reasonably
  fixable within) this SEO work. The `noIndex` return above is what
  actually prevents the SEO harm (a search engine that respects
  `<meta name="robots">` — which all major ones do — won't index the page
  regardless of status code); a search engine that instead flags this as a
  "soft 404" would still be a legitimate remaining gap. Investigate
  `notFound()`/response-streaming behavior specifically if this needs a
  real fix later.

### `lib/json-ld.ts` — structured data, and what "only when eligible" means in code

Every builder returns a plain object (`JsonLdNode`), rendered via
`<JsonLd data={...} />` (`components/shared/json-ld.tsx`) — one
`<script type="application/ld+json">` per node, `dangerouslySetInnerHTML`
is safe here because every node is built server-side from trusted data
(product/category/settings rows, hardcoded FAQ copy), never raw user input.

- **`buildOrganizationJsonLd`/`buildWebsiteJsonLd`** — homepage only
  (`(marketing)/page.tsx`'s `HomeJsonLd`, its own tiny async Server
  Component + `Suspense` boundary, same pattern as `HeroContactSupportButton`
  — `HomePage` itself must stay synchronous so `Hero` etc. keep painting
  immediately, see that component's doc comment). Google's own guidance is
  that `Organization` markup belongs on the page that represents the
  business, typically the homepage — not repeated on every page.
  `sameAs` only lists social links an admin has actually configured
  (`/admin/settings`' Social section), never a placeholder/empty URL.
- **`buildBreadcrumbJsonLd`**, rendered via `<Breadcrumbs items={...} />`
  (`components/shared/breadcrumbs.tsx`) — the visible trail and the
  `BreadcrumbList` JSON-LD are built from the *same* `items` array,
  deliberately: Google's structured-data guidelines expect markup to
  reflect what's actually visible, not describe a hierarchy the visitor
  can't also see. Rendered on `/shop`, `/categories`, `/category/[slug]`,
  and `/products/[slug]`.
- **`buildProductJsonLd`** — "Product structured data where valid" means
  every field is either verified-present data or omitted, never guessed.
  `offers.seller` is `{ name: "Digital Subs BD" }` (the actual merchant of
  record); there is **no top-level `brand` field** — these products resell
  third-party subscriptions (Netflix, Spotify, ...), so the *accurate*
  brand would be that third party, not this store, and with no `brand`
  column in this schema to source it correctly, omitting the field is more
  honest than guessing wrong.
- **`isAggregateRatingEligible`/`AggregateRating`** — "review structured
  data only when requirements are actually satisfied," and here that
  splits into two different answers for two different things:
  - `AggregateRating` is included when `ratingSummary.count > 0` (verified
    live: seeding two approved reviews — ratings 5 and 3 — produces
    `{"ratingValue":4,"reviewCount":2}`; a product with zero approved
    reviews correctly has no `aggregateRating` key at all, not a
    zero-valued one).
  - **Individual `Review` nodes are deliberately never added.**
    Schema.org/Google's Review markup requires a distinguishable `author`,
    but `ProductReviews` never displays an individual reviewer's name
    publicly — every review renders as "Verified customer" (see
    [Product reviews](#product-reviews-productsslug-adminreviews);
    `reviewer_name`/`reviewer_email` are staff-only fields). Fabricating a
    uniform "Verified Customer" author across several distinct `Review`
    nodes would misrepresent the visible page *and* is exactly the shape
    of pattern Google's manipulated-review detection flags. So "only when
    requirements are satisfied" resolves to aggregate-only here — this is
    a considered omission, not a TODO.
- **`buildCategoryJsonLd`** — `CollectionPage` with an `ItemList` built
  from *exactly* the `products` array the page already passed to
  `ProductGrid` (never a separate/larger fetch), so the markup never
  claims more items than a visitor can actually see on that page.
- **`isFaqEligible`/`buildFaqJsonLd`** — "FAQ structured data only where
  eligible and appropriate." Eligibility is a real, checked condition (a
  non-empty `question`/`answer` on every entry — schema.org's `Question`/
  `Answer` require non-blank `name`/`text`), not assumed. All three FAQ
  components (`components/marketing/faq.tsx`'s homepage `Faq`,
  `features/products/components/product-faq.tsx`'s `ProductFaq`,
  `features/categories/components/category-faq.tsx`'s `CategoryFaq`) build
  their own `FAQPage` JSON-LD internally from the exact array they render
  (same "structured data must match visible content" reasoning as
  breadcrumbs) and render nothing when `buildFaqJsonLd` returns `null`.
  Note Google restricted `FAQPage` *rich-result display* to a narrow set of
  authoritative sites in 2023 — this app's markup likely won't earn a
  visible SERP rich result, but it remains valid, spec-compliant structured
  data other consumers (Bing, AI/LLM crawlers) can still use, which is why
  it's still worth emitting correctly rather than skipped.

### `robots.ts` / `sitemap.ts`

`src/app/robots.ts` and `src/app/sitemap.ts` are both plain Next.js
Metadata Route conventions (`MetadataRoute.Robots`/`MetadataRoute.Sitemap`)
— both render as static (`○`, per `next build`'s own output), so they're
prerendered/cacheable, not computed per-request.

`sitemap.ts` calls `categoriesService.listCategories`/
`productsService.listProducts` with **no options/filters passed** —
both already hardcode `.eq("status", "active")` and return every matching
row unpaginated when called this way (confirmed: no extra filtering logic
needed here at all, "generate from active public products/categories" falls
straight out of the existing service functions). Uses `createAdminClient()`
(service-role, no `cookies()` call) for the same reason `getPublicSettings()`
does — this route has no request-scoped session, and the cookie-free client
is what keeps it cacheable. `export const revalidate = 3600` matches
`/category/[slug]`'s own cache lifetime, so the sitemap's `lastModified`
values are never claimed fresher than the pages they describe.

`robots.ts`'s `disallow` list is a deliberate mirror of every route this
app marks `noindex` at the metadata level (see above) — belt-and-suspenders,
not redundant: a meta-robots tag stops *indexing* a page a crawler already
fetched, while a `robots.txt` disallow stops the *fetch* itself, saving
crawl budget for `/`, `/shop`, `/categories`, `/category/*`, `/products/*`.
**"Do not expose private/admin routes in sitemap"**: `sitemap.ts` only ever
constructs URLs for the three static entries plus enumerated
category/product slugs — there is no code path that could add an
`/admin/*` or `/dashboard/*` URL to it even by mistake, unlike `robots.ts`'s
disallow list which has to be kept in sync by hand. If you add a new
public, genuinely indexable route, add it to *both* files — `sitemap.ts`'s
own doc comment repeats this.

### `public/og.png`

A real (not placeholder-404) Open Graph image, generated from an inline
SVG via `sharp` — brand colors matching this doc's
[Design system](#design-system) table. `/admin/settings`' SEO section's
`ogImage` field defaults to `/og.png` (`settingsService.getSettings`'s
`DEFAULT_SETTINGS`), and before this file existed that default resolved to
a 404, which every page's `openGraph.image`/`twitter.image` would have
silently inherited. Replace this file (or set a different `ogImage` in
`/admin/settings`) with real branded artwork before launch — this is a
functional placeholder, not final creative.

## Performance

A production-performance pass audited Server/Client boundaries, images, database queries/indexes/
caching, fonts, layout shift, and `loading.tsx`/`error.tsx` coverage across the whole app. Most of
the codebase was already disciplined about this (every `page.tsx` was already a Server Component,
forms were already small client islands) — what follows is what that audit found and fixed, and
the conventions to keep following.

### Server vs. Client Components

- **`components/ui/table.tsx` has no `"use client"`** — it never did anything to need it (no
  hooks, no handlers), the directive was a leftover from the shadcn template. Every admin list page
  renders `&lt;Table&gt;` as a Server Component again now; only the small `*-row-actions.tsx` files
  inside each row still need to be client. Don't add `"use client"` back to it "to be safe" — if a
  future change to this file genuinely needs a hook, that's the signal to add it back, not before.
- **`LoadingSpinner`** (`components/shared/loading-spinner.tsx`) dropped `framer-motion` for a
  plain CSS `animate-spin` and lost `"use client"` with it — this is the single most-reused
  component in the app (every submit button's pending state), so this alone keeps `framer-motion`
  out of any file that only needed it for this spinner, and lets it be rendered from a Server
  Component (a Suspense-fallback skeleton, say) without forcing that file client.
- **`AuthCard`** (`features/auth/components/auth-card.tsx`) and **`OrderTrackingResultView`**
  (`features/order-tracking/components/order-tracking-result.tsx`) both dropped a one-shot
  `framer-motion` entrance (`fadeInUp`) for the equivalent `tw-animate-css` classes
  (`animate-in fade-in slide-in-from-bottom-3 duration-300`) — neither had any other hook/handler,
  so `AuthCard` is a Server Component again (only its `children` — `LoginForm`/`RegisterForm`/etc.
  — still need to be client, for `react-hook-form`); `OrderTrackingResultView` no longer pulls in
  `framer-motion` at all. **`Reveal`** (`components/shared/reveal.tsx`) is the one legitimate
  `framer-motion` user left for entrance animation — it uses `whileInView` (a real scroll-triggered
  intersection observer, not a one-shot mount fade), which CSS alone can't replicate as cleanly;
  don't "fix" `Reveal` the same way `AuthCard` was fixed, they're not the same case.
- **Recharts is lazy-loaded, not bundled eagerly.** `features/admin/components/dashboard-charts.tsx`
  is a small Client Component whose only job is `next/dynamic(() =&gt; import(...), { ssr: false })`
  for `RevenueChart`/`OrderStatusChart` (each with a `Skeleton` loading fallback matching
  `admin/dashboard/loading.tsx`'s own chart placeholder size) — `recharts` is a sizeable
  client-only library used nowhere else in the app, and this dropped `/admin/dashboard`'s First
  Load JS from ~325 kB to ~200 kB (verified via `next build`'s own output, not estimated).
  `admin/dashboard/page.tsx` renders `&lt;DashboardCharts revenueSeries={...} orderStatusCounts={...} /&gt;`
  and stays a Server Component itself — `ssr: false` is disallowed directly inside a Server
  Component in the App Router, which is exactly why this indirection exists rather than calling
  `dynamic()` straight from the page. `RevenueChart`/`OrderStatusChart` are no longer re-exported
  from `features/admin/components/index.ts` — import `DashboardCharts` instead of either of them
  directly; a future second call site would need its own thought about whether to reuse this
  wrapper or add a different one, not just re-export the eager versions again.

### Images

`next/image` is used everywhere except one deliberate, documented exception —
`features/payments/components/screenshot-preview-dialog.tsx`'s raw `&lt;img&gt;`, a signed URL into
*private* Storage (not the public bucket `next.config.ts`'s `remotePatterns` covers), single-use
and expiring, not something `next/image` can usefully optimize or cache; don't "fix" this one.
Every `fill`-based image already passes a `sizes` string matching its actual rendered width
(a bare pixel value for fixed-size thumbnails, a viewport-breakpoint expression mirroring the
surrounding grid's own breakpoints for responsive grid images) — match this convention for any new
image rather than inventing a new `sizes` shape.

**`priority` is now set on every real LCP candidate, not just one.** `ProductGallery`'s main
product-detail image already had it. Two more were missing:
- `ProductCard` (`features/products/components/product-card.tsx`) takes a `priority` prop, and
  `ProductGrid` (`features/products/components/product-grid.tsx`) passes `priority={index &lt; 4}`
  — only the first row, never every card in a grid (`next/image` warns if `priority` is set on more
  images than are actually above the fold). This is what makes the first product image on `/shop`,
  `/category/[slug]`, and the homepage's grids load eagerly instead of lazily.
- `CategoryBanner`'s icon (`features/categories/components/category-banner.tsx`) — the one image on
  `/category/[slug]`'s hero, always above the fold.

### Layout shift

Two skeleton/real-content mismatches were found and fixed — both were genuine visible-reflow bugs,
not cosmetic nitpicks:
- **`SectionSkeleton`** (`components/marketing/section-skeleton.tsx`, the homepage's Suspense
  fallback for `CategoriesSection`/`FeaturedProducts`/`Testimonials`) now takes a `gridClassName`
  prop instead of one hardcoded grid shape shared across all three sections — it only ever matched
  `CategoriesSection`'s real grid; `FeaturedProducts` (1 column on mobile, not the default's 2) and
  `Testimonials` (1/2/3 columns, not 2/2/4) each pass their own matching `gridClassName` now (see
  `(marketing)/page.tsx`'s `Suspense` calls). `CategoriesSection`'s call keeps the default.
- **`ProductGridSkeleton`'s `lg:grid-cols-3` is correct, not a bug** — it was flagged during the
  audit as a mismatch against `ProductGrid`'s *default* 4-column grid, but `ProductGridSkeleton` is
  only ever used on `/shop`, whose `ProductGrid` call overrides to `className="lg:grid-cols-3"`
  (the sidebar filter panel takes the 4th column's width there). Verify which real grid a skeleton
  actually pairs with before "fixing" a column-count mismatch — comparing against a component's
  bare default isn't the same as comparing against what a specific page actually renders.

### Database: indexes, N+1s, and caching

**Four missing indexes**, added in `supabase/migrations/20260901000900_add_missing_indexes.sql`
and applied to the live database — every other frequently-filtered/sorted column already had one;
these didn't: `categories.status` (every public listing filters `status = 'active'` with no
supporting index), `orders.created_at` (every admin order sort, and `admin_revenue_daily()`/
`admin_revenue_monthly()`, sorted/ranged on it unindexed), `payments.status` (`listPendingPayments`/
`listPaymentsForAdmin`/`admin_dashboard_stats()` all filter `status = 'pending'` unindexed), and
`reviews.user_id` (the `(product_id, user_id)` composite unique constraint only serves
`product_id`-led lookups — a `user_id`-only query, "all of this customer's own reviews," had
nothing to use). Confirmed live via `pg_indexes` after applying, not just written and assumed.

**`notificationsService.notifyStaff` was a real N+1**, found and fixed (`src/services/notifications.service.ts`):
previously one `SELECT` (dedup check) plus up to one `INSERT`, *per staff member*, in a loop — on
a sweep with several expiring subscriptions and a handful of staff, that's dozens of round-trips
for one page load. Now: one `SELECT` to find who's already been notified for the exact
`(type, relatedId)`, one bulk `INSERT` for everyone who isn't (falling back to isolated per-staff
inserts only if the bulk insert itself fails — preserving the "one bad row can't silently drop
every other staff member's notification" guarantee from this feature's own earlier bug fix, not
losing it while fixing the N+1). `notifyStaff` also now accepts an optional pre-fetched `staffIds`
list (via the new `getStaffIds` export) so a caller sweeping several events in one pass
(`syncSubscriptionLifecycleNotifications`, `checkoutService.placeOrder`'s two `notifyStaff` calls)
fetches the staff list once, not once per event.

**`getPublicSettings()` (`src/lib/settings.ts`) is `cache()`-wrapped at the source now**, not left
for every call site to remember its own local `cache()` wrapper. It's called independently from
the root layout, `(marketing)`/`(dashboard)` layouts, the homepage, `Hero`'s nested
`HeroContactSupportButton`, `/products/[slug]`, `/checkout`, `/order-tracking`, and more — none of
those call sites know about each other's fetches. Before this fix, a single homepage request was
issuing 4 separate `settings` table round-trips; now it's one, automatically, for any request tree
regardless of how many components in it call `getPublicSettings()`.

**Caching safe public data, never private customer data**: `/category/[slug]` was already the one
statically-generated route (`revalidate = 3600`, a cookie-free `createStaticSupabaseClient()`).
Two more routes now use the same pattern — **the homepage** (`(marketing)/page.tsx`, now
`revalidate = 3600`) and **`/categories`** (same) — once their data-fetching subtrees
(`CategoriesSection`/`FeaturedProducts`/`Testimonials`, and `getPublicSettings` itself) were
converted from `createServerSupabaseClient()` (cookies-based, which alone forces a route dynamic
regardless of whether the session is actually used) to `createStaticSupabaseClient()`. Both `next
build`'s own route table (`○` static, `1h` revalidate) and a live check that real category/product
data still renders through the anon-key client confirm this actually works, not just compiles.
**`/products/[slug]` deliberately stays dynamic, and does *not* export `revalidate`** — `loadProduct`
and the rating-summary fetch were converted to the cookie-free client (a real, if smaller, win: two
fewer cookie-based round-trips per request), but `ProductReviews` (rendered on the same page) calls
`getCurrentUser()` to compute the *signed-in visitor's own* review-submission eligibility, which is
genuinely per-visitor and must stay dynamic. This is "cache safe public data, don't cache private
customer data" cutting the other way: don't add `revalidate` here without first resolving that a
different, deliberate way (a Suspense-isolated review section wouldn't help either — in this app's
non-PPR rendering model, any `cookies()` call anywhere in a route's render tree marks the whole
route dynamic, Suspense boundaries only defer streaming, not static/dynamic classification).
**`/shop` deliberately stays fully dynamic too** — its content is genuinely a function of
per-request `search`/`sort`/`category`/`page` query params, not a caching gap to close.

### Pagination

`/dashboard/orders` now paginates (`listOrdersForUser` gained an `offset` option, same "fetch
`pageSize + 1`, slice, check `hasMore`" convention as every admin list, `PER_PAGE = 20` matching
them) — it used to fetch a customer's *entire* order history unbounded on every visit.
`/dashboard/subscriptions` deliberately stays unpaginated: it groups subscriptions by computed
status (active/expiring/expired/cancelled) for display, which doesn't paginate naturally the way a
flat list does, and a customer's subscription count is typically much smaller than their order
count in practice — a deliberate scope boundary, not an oversight matching the one just fixed.

### Fonts

`next/font/google` (Geist, Space Grotesk) now sets `display: "swap"` explicitly — it was already
next/font's own default, so this changed no actual behavior, but makes it a documented choice
instead of an implicit one. Confirmed no competing font-loading path exists anywhere (`grep`ped for
`fonts.googleapis.com`/`fonts.gstatic.com`/`@font-face` across `src/` — zero matches): `next/font`
self-hosts both faces, so there's no separate CDN request or FOUC risk to begin with.

### `loading.tsx` / `error.tsx` coverage

**`(dashboard)/loading.tsx` and `(dashboard)/error.tsx` are new** — this was the single biggest
coverage gap found: `(marketing)` and `(admin)` both already had at least a group-level fallback
(`(marketing)/loading.tsx`, `(admin)/admin/loading.tsx` + `admin/dashboard/loading.tsx`, plus
`(admin)/admin/error.tsx`), but `(dashboard)` had neither a `loading.tsx` nor an `error.tsx`
anywhere in its chain — and three of its pages (`/dashboard`, `/dashboard/orders`,
`/dashboard/subscriptions`) do multi-query fetches with no manual try/catch of their own (unlike
most admin/marketing pages), so a slow fetch showed a frozen page and a failed one propagated all
the way to the generic root `error.tsx` with no dashboard-specific "back" link. Both new files
follow `(admin)/admin/error.tsx`'s established shape (a `Skeleton`-based loading fallback roughly
matching the overview page's layout; an `AlertTriangle` + "Try again"/"Back to dashboard" error
boundary) rather than inventing a new style.

`/admin/products/[id]/edit`'s `productsService.getProductById` call was also unguarded (only its
sibling `categories` fetch had a `.catch()`) — every other admin detail page wraps its fetch in
try/catch + `unstable_rethrow` + an inline `Alert`, this one didn't. Fixed for consistency; it was
never *unprotected* (`(admin)/admin/error.tsx` already covers an uncaught throw), just inconsistent
with how every sibling page handles the same class of failure.

## Database schema (Supabase)

`supabase/migrations/*.sql` — one file per table, in dependency order (each
only references tables/functions created in an earlier-numbered file), plus
a shared `extensions_and_helpers.sql` first. No CLI project (`supabase
init`) is wired up yet — these are hand-written SQL files, not something
`supabase migration new` generated; running them against a real project
needs `supabase link` (or `supabase start` for local dev) first.
`supabase/seed/seed.sql` seeds 4 categories (AI Tools, Streaming, Design,
Software) and 4 products (Netflix Premium, Canva Pro, ChatGPT Plus, Adobe
Creative Cloud) — re-runnable (`on conflict ... do nothing`), no
`product_variants`/`orders`/etc. rows seeded.

This schema has been revised once already — table shapes below are the
current, leaner revision (fewer columns per table than an earlier pass:
e.g. no `order_number` on `orders`, no `is_approved` on `reviews`). If you're
looking at an old description of this schema, this section is the one to
trust.

**Every table**: UUID primary key (`gen_random_uuid()`, via the `pgcrypto`
extension enabled in the first migration), `created_at`/`updated_at`
timestamptz columns, `updated_at` auto-maintained by a shared
`set_updated_at()` trigger (defined once, attached everywhere) rather than
left to application code to remember. RLS is enabled on every table —
the original twelve (`profiles`, `categories`, `products`,
`product_variants`, `orders`, `order_items`, `payments`, `subscriptions`,
`reviews`, `coupons`, `notifications`, `settings`) plus four added by later
feature work: `order_activity`, `subscription_activity`,
`subscription_deliveries`, `coupon_usages` — see each one's own section
above for what it's for and why its RLS is shaped the way it is.

**`public.is_admin()`** (defined in `create_profiles.sql`, right after the
`profiles` table) was originally the admin check every table's "full
access" policy used — `security definer` so it can read `profiles`
regardless of the caller's own grants, which also sidesteps the
self-referential-RLS problem a policy on `profiles` would otherwise hit
querying `profiles` for the caller's own role. It's a `language sql`
function specifically so it had to be defined *after* `profiles` exists
(Postgres resolves a SQL-language function body's table/column references
against the catalog at `CREATE FUNCTION` time, unlike `plpgsql`) — if a
future migration needs another helper like this, keep that ordering
constraint in mind (as `is_staff()` below already did).

**`public.is_staff()`** (added by `20260828001600_add_manager_role.sql`,
same file that widened `profiles.role` to add `manager`) is `role in
('admin', 'manager')` — same security/ordering properties as `is_admin()`.
Operational tables' "full access" policies (`categories`, `products`,
`product_variants`, `orders`, `order_items`, `payments`, `subscriptions`,
`reviews`) were migrated from `is_admin()` to `is_staff()`; `profiles`,
`coupons`, `coupon_usages`, `settings` deliberately still use `is_admin()`
alone. See
[Admin authorization](#admin-authorization-customermanageradmin) for the
full picture, including a real bug this split caused (and how it was
fixed) in `notificationsService.createNotification`.

**RLS policies implement more than the three customer-read rules and the
admin-full-access rule this schema was scoped from** — every extension
beyond that literal list is commented in its migration file at the point it
happens, but the shape is:

- **Public read** extends from `products` (as specified, gated on
  `status = 'active'` since there's no `is_active` boolean in this
  revision) to `categories` (unconditional — no status column there at
  all) and `product_variants` (gated on the *parent product's* status,
  since variants have no status column of their own either).
- **Customer INSERT** on `orders`, `order_items`, `payments` (scoped to
  rows the customer's own `user_id`/parent order ownership covers) is
  currently unexercised by application code — `checkoutService.placeOrder`
  writes through the service-role client instead (see
  [Checkout](#checkout-checkout-checkoutconfirmationorderid) for why: it
  needs to be able to roll back its own writes, which customers' own RLS
  can't do since there's no customer DELETE policy on `orders`). These
  policies are kept for a possible future direct-client write path, not
  dead weight to remove — just don't assume they're what's actually gating
  checkout's writes today. `payments` also gets a customer UPDATE scoped to
  `status = 'pending'` rows (so a customer can submit
  `transaction_id`/`screenshot` on their own pending payment) — the
  `with check` re-asserts `status = 'pending'` on the post-update row too,
  so a customer can fill in those fields but can't flip their own payment to
  `verified`. Also currently unexercised (checkout writes the full payment
  row in one INSERT via the service-role client, not a later customer-side
  UPDATE) — relevant if a "finish payment info later" flow gets built.
- **`reviews`/`notifications`** get baseline customer policies (read +
  insert/update own for reviews — reviews are public immediately, no
  moderation flag in this revision; read own + update own "mark read" for
  notifications). `reviews` still has no service/action code touching it;
  `notifications`' read-own/update-own policies are exactly what
  `getNotificationsAction`/`markNotificationReadAction`/
  `markAllNotificationsReadAction` run on now — see
  [Notifications](#notifications-notificationbell-in-navbar).
- **`coupons`/`coupon_usages`/`settings`** stay admin-only, no public or
  customer policy — operational/config and revenue data. Coupon-code
  redemption at checkout was built without adding a customer policy here:
  it validates a single code server-side on the service-role client
  `checkoutService.placeOrder` already runs on, the same way order/payment
  creation does — see
  [Coupon management](#coupon-management-admincoupons-and-checkout-discounts).
- **`subscriptions`** deliberately has no customer INSERT/UPDATE policy —
  every write (manual admin creation, extend, change expiry, cancel,
  reactivate, and the automatic provisioning `approve_payment()` does) goes
  through a staff/admin session or the service-role client, never a
  customer's own. See
  [Subscription management](#subscription-management-adminsubscriptions-adminsubscriptionsid).

**Known mismatch with already-built app code** — the `products`/
`categories`/`profiles.avatar` entries that used to be here are fixed, and
so are `orders`/`order_items`/`payments` (checkout reconciled all three —
see [Checkout](#checkout-checkout-checkoutconfirmationorderid)),
`subscriptions`/`notifications` (payment verification reconciled both —
see [Payment verification & subscriptions](#payment-verification--subscriptions-adminpayments)),
`reviews` (moderation reconciled it — see
[Product reviews](#product-reviews-productsslug-adminreviews); note it
ended up with a `status` text enum, not the `is_approved` boolean the
original migration's own comment assumed a future moderation column would
look like — see that section for why), and `coupons` (coupon management
reconciled it, plus added `coupon_usages` and `orders.discount_amount`/
`coupon_code` — see
[Coupon management](#coupon-management-admincoupons-and-checkout-discounts)).
`notifications` is now also reconciled — it gained `type`/`related_id` (the
notification center — see
[Notification center](#notification-center-notificationbell-in-navbaradminheader-dashboardnotifications)).
What's still outstanding — none of these are touched by anything built so
far:

- `reviews` still has no `title` column — moot today, nothing asked for one
  (submission is rating + comment only), but relevant if a review UI with a
  headline gets designed later.

## Data flow for a domain

A read, end to end — the homepage's featured products (same shape for
categories/reviews):

```
FeaturedProducts (src/components/marketing/featured-products.tsx)
  - createServerSupabaseClient() — anon/session-scoped, not admin
  - try { productsService.listProducts(supabase, {}, { limit: 8 }) } catch { render Alert instead }
  → productsService.listProducts (src/services/products.service.ts)
      - .select("*, category:categories(*), variants:product_variants(*)")
      - .eq("status", "active")   — RLS would block inactive rows anyway; this
        avoids relying on that to also mean "don't show it on the homepage"
      - maps snake_case rows → the camelCase `Product` type
  → Supabase (Postgres, RLS: "Products: public read")
```

A write, end to end — a customer checks out (see
[Checkout](#checkout-checkout-checkoutconfirmationorderid) for the full
picture):

```
CheckoutForm (src/features/checkout/components/checkout-form.tsx)
  - builds FormData: text fields + JSON-encoded cart items + the screenshot File
  → createCheckoutOrderAction (src/actions/checkout.actions.ts)
      - requireUser()
      - createCheckoutOrderSchema.safeParse(...)
      - re-validates the screenshot's type/size server-side too
      - checkoutService.placeOrder(adminClient, userId, input, screenshot)
      - revalidatePath(ROUTES.dashboardOrders)
  → checkoutService.placeOrder (src/services/checkout.service.ts)
      - re-fetches product/variant prices server-side (never trusts client-sent prices)
      - ordersService.createOrder → ordersService.createOrderItems →
        paymentsService.uploadPaymentScreenshot → paymentsService.createPayment
      - any failure after the order is created deletes it (cascades items/payments)
        and removes an already-uploaded screenshot — see that file's doc comment
  → Supabase (Postgres + Storage, via the service-role client — see why below)
```

Provisioning the subscription itself happens on the *next* write — an admin
approving that `payments` row:

```
AdminPaymentRowActions (src/features/payments/components/admin-payment-row-actions.tsx)
  → approvePaymentAction (src/actions/payments.actions.ts)
      - requireAdmin()
      - approvePaymentSchema.safeParse(...)   // accepts only { paymentId }
      - paymentVerificationService.approvePayment(sessionClient, paymentId, actor)
      - revalidatePath(ROUTES.adminPayments); revalidatePath(order detail)
  → paymentVerificationService.approvePayment (src/services/payment-verification.service.ts)
      - one .rpc("approve_payment", { p_payment_id, p_actor_id, p_actor_name })
  → approve_payment() Postgres function (supabase/migrations/20260831000200_...)
      - all in ONE transaction: claim payment pending→verified (duplicate-approval guard)
      - insert subscriptions per distinct product → log subscription_delivered
      - orders.payment_status = "paid" → log payment_approved
      - if orders.status = "pending": orders.status = "processing" → log order_processing
      - insert customer notification
  → Supabase (Postgres, via the admin's own session-scoped client — every table
    the function touches has an is_staff()/is_admin() RLS policy, so no
    service-role client is needed here, unlike checkout above)
```

See [Payment verification & subscriptions](#payment-verification--subscriptions-adminpayments)
for the full picture, including why `getPaymentScreenshotUrlAction`
specifically *does* need the service-role client even though the rest of
this flow doesn't.

## Coding standards

**Server Components by default.** Every file in `src/app/` is a Server
Component unless it has `"use client"` at the top. Data fetching happens
directly in the component (`await productsService.listProducts(supabase)`) —
no client-side loading spinners for data that's available at request time.

**Client Components only when required** — meaning only for: local
interactive state (`useState`/`useReducer`), browser-only APIs
(`useMediaQuery`, `useCurrentUser`), or a library that needs the DOM
(`next-themes`, `sonner`). Push `"use client"` as far down the tree as
possible — a whole page should not be a Client Component because one button
in it needs an `onClick`.

**No business logic in `app/`.** Pages call `services/*` (reads) or
`actions/*` (writes). If a page starts accumulating `if`/data-shaping logic,
that logic belongs in a service function instead.

**Validate at the boundary.** Every Server Action parses its input through a
`features/<domain>` Zod schema before touching a service. Services trust
their arguments — validation happens once, at the action layer.

**No premature abstraction.** Don't add a hook, a generic component, or a
config layer for a single call site. Three similar lines beat a speculative
abstraction. This repo would rather have `format-currency.ts` and
`format-date.ts` as two small files than one over-general `formatters.ts`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values — see that file
for the full list (Supabase keys, site URL, payment gateway credentials,
transactional email — see
[Transactional email](#transactional-email-servicesemail)).
`src/lib/env.ts` validates `process.env` with Zod (`getServerEnv`/`getClientEnv`)
so a missing variable fails fast with a clear message instead of a cryptic
error three calls deep inside a Supabase client. `EMAIL_PROVIDER`/
`EMAIL_FROM_ADDRESS`/`EMAIL_FROM_NAME`/`RESEND_API_KEY` all default to a
zero-config dev-safe state (`EMAIL_PROVIDER=console`), so none of them need
to be set at all for local development — `RESEND_API_KEY` is server-only and
never read by `getClientEnv()`.

## Deployment (Cloudflare)

Full deployment reference: [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) — local dev vs.
production build vs. actual deploy, the R2 + three-Durable-Object caching stack this app's ISR/
`revalidatePath()` usage requires (without it, `defineCloudflareConfig()` silently defaults to a
no-op cache and every `revalidate = 3600` page behaves as fully dynamic), the `IMAGES` binding,
build-time vs. runtime environment variables (two different mechanisms, easy to conflate — read
that section before assuming a `.env.local` value reaches the deployed Worker), custom domains,
Supabase-specific configuration, and troubleshooting. Read it before touching `wrangler.jsonc`/
`open-next.config.ts`/`next.config.ts`'s Cloudflare-related pieces — in particular, don't re-add
`initOpenNextCloudflareForDev()` to `next.config.ts` without reading why it was deliberately left
out (it hung `next typegen`, a real, verified problem, not a style preference).

`open-next.config.ts` and `wrangler.jsonc` configure the
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapter — neither affects
`npm run dev` / `npm run build` (plain Next.js), only `npm run cf:build`/`preview`/`deploy`/
`cf:upload`.

## Security audit

A full audit covering RLS, authentication/authorization, Server Actions, API
routes, admin routes, input validation, SQLi/XSS/CSRF, file uploads, rate
limiting, sensitive data exposure, env vars/service-role key exposure, and
payment/coupon/order/subscription manipulation (IDOR) was run against this
app. Most of the surface area was already sound — this section documents
the gaps that were real and got fixed, plus the load-bearing design notes
worth knowing before touching any of it again.

**`redeem_coupon()` RPC exposure (the one genuine coupon/order-manipulation
vector found).** Every Postgres function is auto-exposed by PostgREST as a
callable RPC to `authenticated`/`anon` by default. `redeem_coupon()` is only
ever meant to be called from `checkoutService.placeOrder` (always on the
service-role client) — there is no legitimate `authenticated`-role caller.
Without the fix, a signed-in customer could call
`supabase.rpc("redeem_coupon", {...})` directly with an arbitrary
`p_order_id` and `p_discount_amount`, incrementing `coupons.used_count` and
inserting a bogus `coupon_usages` row unrelated to a real order. Fixed by
`revoke execute ... from authenticated, anon, public` in
`supabase/migrations/20260901001000_security_audit_fixes.sql` — **all
three** roles, not just `authenticated`/`anon`: Postgres grants `execute`
to the `PUBLIC` pseudo-role at function-creation time by default, and every
role implicitly inherits whatever's granted to `PUBLIC` in addition to its
own grants, so revoking only from the named roles leaves the function fully
callable via the `PUBLIC` grant alone (verified live — this was tried first
and confirmed insufficient via `pg_proc.proacl`). `approve_payment()`/
`reject_payment()` were deliberately left alone despite being the same
"auto-exposed RPC" shape — those two ARE legitimately called via a staff
member's own session-scoped client, so revoking `authenticated` access
would break the real admin workflow; their protection correctly comes from
`payments`' RLS `WITH CHECK` clause instead (verified that clause blocks a
non-staff caller even via direct RPC). Re-verified live post-fix: an
anonymous client calling either `redeem_coupon` or `check_rate_limit`
(below) now gets `permission denied for function ... (42501)`.

**Rate limiting (there was none anywhere).** Added `src/lib/rate-limit.ts` —
`checkRateLimit(bucketKey, {limit, windowSeconds})`, backed by
`check_rate_limit()` (same migration as above), a Postgres-table-backed
atomic `insert ... on conflict do update` increment, not an in-memory
counter. That's deliberate: this app deploys to Cloudflare via OpenNext, a
serverless/edge runtime with no guarantee two requests land on the same
instance, so in-memory state would silently under-count. Fails **open** —
a rate-limiter DB error lets the action proceed rather than blocking every
login/checkout in the app over an unrelated infra hiccup. `rate_limits` has
RLS enabled with **no policies at all** (every access goes through
`check_rate_limit()` on the service-role client) and, like `redeem_coupon`,
has `execute` revoked from `authenticated, anon, public` — letting any
signed-in/anonymous caller invoke it directly would let them reset or pad
their own counters. Wired into the highest-abuse-risk Server Actions:
`loginAction` (by email AND by IP — credential stuffing vs. one-source
mass attempts are different threats), `registerAction` (by IP),
`forgotPasswordAction` (by email — email-bombing a target is defined by
the target, not the source), `trackOrderAction` (by IP — order ids are
unguessable UUIDs, but the low-entropy BD phone number paired with a
leaked/guessed order id needs throttling), `validateCouponAction` (by
user — bounds coupon-code brute-forcing while staying generous enough for
normal typo-retry use), `createCheckoutOrderAction` (by user), and
`createReviewAction` (by user — a generous backstop behind the
already-real verified-purchase + one-review-per-product constraints, not
the primary defense there).

**Payment screenshot upload validation gap.**
`paymentsService.uploadPaymentScreenshot` used to trust its one caller
(`checkout.actions.ts`) to have already validated type/size, using a
locally re-duplicated copy of the same constants — unsafe for any future
call site that forgot to check first. Now validates `file.type`/`file.size`
itself against the shared `IMAGE_ALLOWED_TYPES`/`IMAGE_MAX_BYTES`
(`constants/images.ts`, the same constants
`uploadProductImage`/`uploadCategoryImage` already used), and derives the
storage-path extension from the *validated* MIME type via
`IMAGE_EXTENSION`, not from `file.name.split(".").pop()` — the old
filename-derived extension let a crafted filename splice unsanitized text
into the storage object key. `checkout.actions.ts` now imports the same
shared constants instead of its own local `MAX_SCREENSHOT_BYTES`/
`ALLOWED_SCREENSHOT_TYPES` copies.

**Confirmed already-safe, deliberately left alone:** the service-role key
is never imported from client-reachable code (`src/lib/supabase/admin.ts`
stays server-only throughout); `profiles` has no customer UPDATE RLS
policy, which is fine because nothing customer-facing tries to write it
directly (`updateProfileAction` uses service-role for exactly this,
already documented above); price/user_id/payment status/subscription
status/admin role are never trusted from client input anywhere in the
Server Action layer (every write re-derives these server-side — see the
"Never trust ... from browser" notes threaded through
[Checkout](#checkout-checkout), [Payment verification](#payment-verification-adminpayments),
and [Admin authorization](#admin-authorization)).

## What's deliberately not built yet

Fourteen surfaces are now fully built: admin order management
(`/admin/orders`, `/admin/orders/[id]` — search/filter list, a detail page
with customer/items/payment/timeline/subscription panels,
approve/reject payment, mark processing/completed, cancel, an
append-only `order_activity` history table — see
[Order management](#order-management-adminorders-adminordersid)), admin
category management
(`/admin/categories` — search/status filter/sort, create/edit via a
`Modal` form, activate/deactivate, delete blocked while a product is still
assigned — see
[Category management](#category-management-admincategories)), admin
product management
(`/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit` —
list/search/filter/sort/paginate, create, edit, activate/deactivate,
delete-with-soft-delete-fallback, Supabase Storage image uploads — see
[Product management](#product-management-adminproducts-adminproductsnew-adminproductsidedit)),
the admin dashboard homepage
(`/admin/dashboard` — real analytics from four `security definer` Postgres
functions, charts, recent orders/pending payments/expiring subscriptions/
top products — see
[Admin dashboard analytics](#admin-dashboard-analytics-admindashboard)),
the homepage (`/`), auth (`/login`,
`/register`, `/forgot-password` — see
[Auth UI](#auth-ui-login-register-forgot-password)), the shop (`/shop`
with search/category/price/duration filters/sort/pagination,
`/products/[slug]`, `/categories`, and `/category/[slug]` — see
[`/shop` and `/products/[slug]`](#shop-and-productsslug) and
[`/category/[slug]`](#categoryslug)), `/cart` (see
[The cart](#the-cart-localstorage-no-backend-storage-is-swappable)),
checkout (`/checkout`, `/checkout/confirmation/[orderId]` — see
[Checkout](#checkout-checkout-checkoutconfirmationorderid)), payment
verification (`/admin/payments` — see
[Payment verification & subscriptions](#payment-verification--subscriptions-adminpayments)),
the full notification center (`NotificationBell` in `Navbar`/`AdminHeader`,
`/dashboard/notifications`, staff fan-out, subscription-lifecycle sync — see
[Notification center](#notification-center-notificationbell-in-navbaradminheader-dashboardnotifications)),
order tracking (`/order-tracking` — see
[Order tracking](#order-tracking-order-tracking)), the customer
dashboard (`/dashboard`, `/dashboard/orders`, `/dashboard/subscriptions`,
`/dashboard/profile` — see
[Customer dashboard](#customer-dashboard-dashboard-dashboardorders-dashboardsubscriptions-dashboardprofile)),
and product reviews (submission on `/products/[slug]`, moderation at
`/admin/reviews`, display there and in homepage testimonials — see
[Product reviews](#product-reviews-productsslug-adminreviews)). The
customer/manager/admin authorization system (middleware + `requireStaff()`/
`requireAdmin()` + RLS's `is_staff()`/`is_admin()` split, `/forbidden`/
`/unauthorized` — see
[Admin authorization](#admin-authorization-customermanageradmin)) is also
fully built, but isn't a "surface" in the same sense — it's the access
layer in front of the nine above, not a page of its own.
Everything else under `src/app/` still renders a minimal placeholder (a
heading, sometimes a live count from a service call). Not yet built:

- A **customer** dashboard sidebar shell — not designed yet. `DashboardNav`
  (see
  [Customer dashboard](#customer-dashboard-dashboard-dashboardorders-dashboardsubscriptions-dashboardprofile))
  is still just a small, contained tab strip for `/dashboard/*`. The
  **admin** side got its full shell (sidebar/header/mobile nav/breadcrumbs)
  — see
  [Admin dashboard shell](#admin-dashboard-shell-componentsadmin) — don't
  assume the two are symmetric just because they're both "a dashboard."
- `/dashboard/settings` is still a bare placeholder — `/dashboard/profile`
  (name/phone editing) covers a different concern (personal info, not
  account/security settings) and doesn't replace it.
- `admin`'s only unbuilt UI is user-role management specifically —
  `updateUserRoleAction` exists and works, but `/admin/customers`
  (see [Customer management](#customer-management-admincustomers-admincustomersid))
  deliberately doesn't wire up new UI for it (out of that feature's
  scope; the page displays each customer's role as a read-only badge).
  Every other admin domain listed in `ADMIN_NAV` now has full, real UI —
  `/admin/dashboard`, `/admin/products`, `/admin/categories`,
  `/admin/orders`, `/admin/payments`, `/admin/subscriptions`,
  `/admin/customers`, `/admin/reviews`, `/admin/coupons`, and
  `/admin/settings` are all real, not placeholders — see each one's own
  section above for what it covers.
- `/reset-password` — the page a password-reset email should land on to set
  a new password, plus the Supabase PKCE code-exchange route in front of it.
  See the note under [Auth UI](#auth-ui-login-register-forgot-password).
- **Realtime notification push.** The full notification center (types,
  dedup, staff fan-out, subscription-lifecycle sync, delete, the
  `/dashboard/notifications` center — see
  [Notification center](#notification-center-notificationbell-in-navbaradminheader-dashboardnotifications))
  is now built, but `NotificationBell` still only fetches on mount/page
  load, never pushed live — no Supabase Realtime subscription here, by
  design, not an oversight. A "Subscription expiring" notification
  similarly only appears once someone actually loads `/dashboard`,
  `/dashboard/subscriptions`, or `/admin/dashboard` — there's still no
  cron/scheduled-job infrastructure anywhere in this app to detect it the
  moment it becomes true.
