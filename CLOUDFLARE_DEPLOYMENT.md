# Cloudflare Deployment

Digital Subs BD deploys to **Cloudflare Workers** via
[OpenNext for Cloudflare](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`) — the
current official path for running a full Next.js App Router app (SSR, ISR, Server Actions,
Middleware, Route Handlers) on Cloudflare. This is **not** Cloudflare Pages and **not**
`@cloudflare/next-on-pages` — both are legacy/limited paths for Next.js on Cloudflare; this repo
has never used either.

This document was written against `@opennextjs/cloudflare@1.20.4` and `wrangler@4.127.0` (the
versions pinned in `package.json` at the time of writing) and verified against the currently
published [opennext.js.org/cloudflare](https://opennext.js.org/cloudflare) docs. If you upgrade
either package, skim the get-started/caching/known-issues pages again before assuming this
document is still accurate — the adapter is under active development.

## Architecture at a glance

- **`next.config.ts`** — plain Next.js config. Deliberately does **not** call
  `initOpenNextCloudflareForDev()` (see [Why `next dev` doesn't simulate Cloudflare
  bindings](#why-next-dev-doesnt-simulate-cloudflare-bindings) below) — `npm run dev` is 100%
  ordinary `next dev`, untouched by any of this.
- **`open-next.config.ts`** — tells the adapter which Cloudflare resources back its caching layer
  (KV for ISR output, Durable Objects for on-demand revalidation). Only read by
  `opennextjs-cloudflare build`.
- **`wrangler.jsonc`** — the Worker's actual runtime configuration: bindings, compatibility flags,
  the Durable Object migrations. Read by `wrangler`/`opennextjs-cloudflare` for build, preview,
  and deploy.
- **`.open-next/`** — build output (gitignored, regenerated every build). `main` in
  `wrangler.jsonc` points at `.open-next/worker.js`.

## Local development

```bash
npm run dev
```

Plain `next dev` — nothing Cloudflare-specific runs. Reads `.env.local` the same way it always
has. This is unaffected by anything in this document; there is no reason to run a Cloudflare-aware
dev server day to day.

### Why `next dev` doesn't simulate Cloudflare bindings

The official get-started guide recommends calling `initOpenNextCloudflareForDev()` from
`next.config.ts` so that application code calling `getCloudflareContext()` (to read a KV/D1/DO
binding directly) also works under `next dev`, not just under `wrangler dev`/preview. This repo
**deliberately doesn't do that**, for two reasons, both verified directly while writing this
config:

1. **Nothing in this codebase calls `getCloudflareContext()`.** The only Cloudflare bindings this
   app uses at all (KV + three Durable Objects, below) are consumed internally by the OpenNext
   adapter's own caching implementation — never by application code. There's nothing for the dev
   simulation to actually serve.
2. **It hangs.** Adding the call caused `next typegen` (part of `npm run typecheck`) to hang
   indefinitely — confirmed by removing the call and watching typecheck immediately return to
   normal (a few seconds) again. The likely cause: `initOpenNextCloudflareForDev()` spins up a
   local Miniflare proxy for every binding in `wrangler.jsonc`, including the
   `WORKER_SELF_REFERENCE` service binding — which points the worker at *itself*, a worker that
   isn't actually running yet during a plain `next typegen`/`next dev` invocation.

If a future feature genuinely needs to read a binding directly from application code, re-add the
call at that point, and expect to need to actually test `next dev`/`next typegen`/`next build`
afterward rather than assuming it's safe — this isn't a hypothetical concern, it broke a real
command in this repo.

## Production build

Two separate build steps, for two different purposes:

```bash
npm run build      # next build — sanity-check the app builds as plain Next.js. Also what
                    # `npm run typecheck`/`npm run lint` implicitly exercise via the pipeline.
npm run cf:build    # opennextjs-cloudflare build — next build, THEN adapts the output into a
                    # Cloudflare Worker at .open-next/worker.js. This is the one that actually
                    # matters for deployment; `npm run preview`/`npm run deploy` both run it first.
```

Local preview of the **real Worker** (not `next dev`, not `next start` — the actual Cloudflare
runtime via `workerd`, run locally):

```bash
npm run preview     # cf:build, then `wrangler dev` against the built worker
```

Use `npm run preview`, not `npm run build && npm run start`, to sanity-check anything you suspect
might behave differently under the Workers runtime specifically (a Node API that's polyfilled
differently, a binding that's missing, timing/streaming behavior) — `next start` runs on real
Node.js and won't reproduce a Workers-runtime-specific bug.

## Cloudflare deployment

### One-time setup (per Cloudflare account, before the first deploy)

1. **Authenticate wrangler**, if you haven't already:
   ```bash
   npx wrangler login
   ```
2. **Create the KV namespace** the incremental cache writes ISR/SSG output to (see [Caching
   architecture](#caching-architecture-why-this-app-needs-kv--three-durable-objects) below for
   why this exists, and why KV rather than R2) — **already done for this project**:
   `kv_namespaces[0].id` in `wrangler.jsonc` is a real namespace id
   (`d3553ea740c24ee3a47bdaf3c97558a1`, created via the command below), not a placeholder. Only
   relevant again if this ever needs recreating (a different Cloudflare account, a fresh
   environment):
   ```bash
   npx wrangler kv namespace create NEXT_INC_CACHE_KV
   ```
   This prints an `id` — paste it into `kv_namespaces[0].id` in `wrangler.jsonc`. Unlike R2, KV
   needs no account-level product activation — it's available on every plan including Free by
   default (1 GB storage / 100,000 reads / 1,000 writes / 1,000 deletes per day, per Cloudflare's
   published KV pricing). `wrangler deploy`/`opennextjs-cloudflare deploy` fails with a clear error
   if this is ever left as the literal placeholder string instead of a real id.
3. **Set runtime secrets** — see [Environment variables](#environment-variables) below. Do this
   before the first deploy; the app will throw on startup (`getServerEnv()`'s Zod validation) if a
   required one is missing.
4. **Set build-time variables**, if deploying via Cloudflare's own CI (Workers Builds) rather than
   from your machine — also covered below. Skip this if you're always deploying locally with
   `.env.local` present.

The three Durable Object classes (`DOQueueHandler`, `DOShardedTagCache`, `BucketCachePurge`) do
**not** need a separate creation step — `wrangler.jsonc`'s `migrations` block provisions them
automatically on the first deploy that includes those bindings. They're SQLite-backed
(`new_sqlite_classes`, not the classic KV-backed kind), which — per Cloudflare's Durable Objects
pricing docs — works on the Workers **Free** plan, not just Paid.

### Deploying

```bash
npm run deploy       # cf:build, then `opennextjs-cloudflare deploy` (wraps `wrangler deploy`)
```

For a versioned/gradual rollout instead of an immediate full deploy, use:

```bash
npm run cf:upload     # cf:build, then `opennextjs-cloudflare upload` (wraps `wrangler versions upload`)
```

then promote it to 100% traffic from the Cloudflare dashboard (Workers & Pages → digitalsubsbd →
Deployments) once you're satisfied.

**This document intentionally stops short of actually deploying** — running `npm run deploy` is
your call to make, not something done as part of preparing this configuration.

### Caching architecture: why this app needs KV + three Durable Objects

This app relies on Next.js ISR in two ways that both need real backing infrastructure to work
correctly on Cloudflare, not just to be *fast*:

- **Time-based revalidation** (`export const revalidate = 3600`) on the homepage, `/categories`,
  `/category/[slug]`, and `/sitemap.xml` — see PROJECT_STRUCTURE.md's Performance section for why
  these were deliberately built as static/ISR rather than per-request dynamic fetches.
- **On-demand revalidation** (`revalidatePath()`) — `categories.actions.ts`'s admin create/update/
  delete actions call `revalidatePath(ROUTES.categories)` (among others) to invalidate the ISR
  `/categories` page immediately after an edit, rather than waiting up to an hour.

Without an explicit `incrementalCache`/`tagCache`/`queue` override, `defineCloudflareConfig()`
defaults **all of them to a no-op `"dummy"` implementation** — confirmed directly by reading the
adapter's own `config.js`. That silently defeats both of the above: `revalidate = 3600` pages would
behave as fully dynamic (recomputed and re-fetched from Supabase on every single request, with no
sharing across Cloudflare's edge locations), and `revalidatePath()` would have no real cache to
invalidate.

`open-next.config.ts` and `wrangler.jsonc` are configured with the full stack for an app using
both revalidation styles — using KV rather than the officially *recommended* R2 for the
incremental cache specifically:

| Binding | Backing resource | Purpose |
|---|---|---|
| `NEXT_INC_CACHE_KV` | KV namespace (see setup above) | Stores the actual rendered ISR/SSG output |
| `NEXT_CACHE_DO_QUEUE` | Durable Object `DOQueueHandler` | Dedupes/coordinates time-based revalidation |
| `NEXT_TAG_CACHE_DO_SHARDED` | Durable Object `DOShardedTagCache` | Tracks which cache tags/paths have been revalidated (what makes `revalidatePath()` work) |
| `NEXT_CACHE_DO_PURGE` | Durable Object `BucketCachePurge` | Purges Cloudflare's CDN cache when `revalidatePath()`/`revalidateTag()` runs |
| `WORKER_SELF_REFERENCE` | Service binding → this same worker | Lets the worker fetch itself, which is how time-based revalidation is actually triggered |

**Why KV, not R2:** R2 is what OpenNext's docs recommend for most projects (strongly consistent,
generous free tier), and this app used it originally. It requires a one-time account-level product
activation, though — and hit a real deploy failure over exactly that: `wrangler deploy` (via
`opennextjs-cloudflare deploy`'s own bucket auto-provisioning step) failed with `403 "Please enable
R2 through the Cloudflare Dashboard"` because this deployment's Cloudflare account hadn't enabled
R2 yet. Rather than requiring that account-level step, this app switched to the KV-backed
incremental cache — no activation gate, included on Workers Free by default — accepting KV's
tradeoffs in exchange: eventual consistency (a revalidated page can take a short while to propagate
across edge locations, vs. R2's strong consistency) and a much lower write quota (1,000 writes/day
on Free, vs. R2's roughly 1M/month). Fine for this app's traffic level; revisit if either becomes a
real constraint, or if R2 gets enabled on the account later — swap `kv-incremental-cache` back for
`r2-incremental-cache` in `open-next.config.ts` and reinstate the `r2_buckets` block in
`wrangler.jsonc` (see `wrangler.jsonc`'s git history for the exact prior configuration).

If a future change removes every `revalidate = N` export and every `revalidatePath()`/
`revalidateTag()` call from the app (unlikely, but worth stating), this entire stack could be
deleted back down to a bare `defineCloudflareConfig()` and a bare `wrangler.jsonc` — it exists
because of those specific features, not by default adapter convention.

### Image optimization: the `IMAGES` binding

`wrangler.jsonc` also declares an `images: { binding: "IMAGES" }` binding, enabling Cloudflare
Images to actually resize/re-encode `next/image` requests for the Supabase Storage product/category
images this app serves (`remotePatterns` in `next.config.ts`).

This is **not** a hard requirement — verified directly against the adapter's image-handling source
(`handleImageRequest` in the adapter's bundled worker template): when `env.IMAGES` is undefined, it
logs a warning and serves the original image unresized rather than erroring. So the app functions
correctly without this binding; you just lose the resizing/format-negotiation benefit and serve
full-size originals to every viewport. Cloudflare Images has its own usage-based pricing beyond a
free tier — if that's undesirable, remove the `images` block from `wrangler.jsonc` and the app
degrades gracefully, it doesn't break.

Known limitations of this binding specifically (per Cloudflare's docs): `next.config.ts`'s
`images.minimumCacheTTL` and `images.dangerouslyAllowLocalIP` aren't supported through it — neither
is currently set in this app's `next.config.ts`, so this isn't a live constraint today, just
something to know if either is ever added.

## Environment variables

Two genuinely different mechanisms, easy to conflate:

### Build-time (baked into the client bundle)

`NEXT_PUBLIC_*` variables are inlined into the client-side JavaScript bundle at `next build` time
— same as any Next.js app, Cloudflare or not. Whatever machine/CI runs `npm run cf:build`/
`npm run deploy` needs these present in its environment (`.env.local`, or the shell) *at build
time*:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` — **must be the real production URL** (e.g.
  `https://digitalsubsbd.com`) before you build for production, not `http://localhost:3000`. It's
  read at runtime too (`forgotPasswordAction` builds the password-reset link from it), so getting
  this wrong doesn't just mis-render a link client-side, it emails customers a broken reset URL.

If you deploy locally (`npm run deploy` from your own machine, the assumed default for this repo),
just make sure `.env.local` has production values before running it. If you ever move to Cloudflare
Workers Builds (Cloudflare's own CI deploying on every push), these need to be set as that
product's "Build variables and secrets" in the dashboard instead — `.env.local` isn't available to
a CI runner.

### Runtime (read by server code via `process.env`)

Everything `src/lib/env.server.ts`'s `getServerEnv()` validates is read from `process.env` **at
request time inside the deployed Worker**, not baked in at build time — confirmed by reading the
adapter's own runtime init code (`populateProcessEnv` copies Cloudflare's `env` bindings into
`process.env` once per Worker isolate, on its first request). Your local `.env.local` has no
effect on the deployed Worker's runtime values; these must be configured on Cloudflare separately:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put NEXT_PUBLIC_SITE_URL
npx wrangler secret put EMAIL_PROVIDER          # "console" or "resend" — see below
npx wrangler secret put EMAIL_FROM_ADDRESS
npx wrangler secret put EMAIL_FROM_NAME
npx wrangler secret put RESEND_API_KEY          # only if EMAIL_PROVIDER=resend
```

`wrangler secret put` works fine for non-secret values too (`EMAIL_PROVIDER`, `NEXT_PUBLIC_*`) —
using it uniformly for everything in the list above is simpler than splitting them between
`wrangler secret put` and a plain `vars` block in `wrangler.jsonc`, and nothing here is sensitive
enough to need a different treatment except `SUPABASE_SERVICE_ROLE_KEY`/`RESEND_API_KEY`, which
*must* be secrets, not plaintext `vars`.

Re-deploying overwrites the Worker's code but does **not** clear dashboard/`wrangler secret`-set
values by default. If you ever deploy with an explicit `vars` block in `wrangler.jsonc` and want to
avoid it wiping out dashboard-configured runtime vars, add `--keep-vars`:

```bash
npx wrangler deploy -- --keep-vars
```

Not currently needed here since this repo's `wrangler.jsonc` has no `vars` block at all — every
runtime value comes from secrets — but worth knowing if that changes.

### Public / server-only / secret classification

`.env.example` groups every variable into one of three exposure levels — read that file's header
before adding a new one. Short version: `NEXT_PUBLIC_*` is **public** (inlined into the browser
bundle, visible to anyone); everything read through `src/lib/env.server.ts` is at least
**server-only** (never inlined, guarded by the `"server-only"` package so a Client Component
importing that module fails the build — verified directly by writing a throwaway Client Component
that imported `getServerEnv()`: `next build` failed immediately with `"You're importing a
component that needs 'server-only'..."` and a precise import trace); `SUPABASE_SERVICE_ROLE_KEY`
and `RESEND_API_KEY` are additionally **secret** — treat exactly like a password, `wrangler secret
put` only, never a plaintext `wrangler.jsonc` `vars` entry.

### Payment and WhatsApp configuration aren't environment variables here

Worth stating plainly since it's a common assumption for an app like this: neither has a
`process.env` variable anywhere in the codebase (verified by grep — the only `process.env.*`
reads in `src/` are the Supabase/site/email ones listed above).

- **Payment**: checkout is manual bKash/Nagad/Rocket "Send Money" + a staff-reviewed screenshot
  upload, not a gateway API integration — see "What's deliberately not built yet" in
  PROJECT_STRUCTURE.md. The Send Money numbers shown at checkout are `siteConfig.payment` in
  `src/constants/site.ts` (placeholder numbers — replace with the real merchant/personal numbers
  in that file before launch, not via an env var). If a real gateway is ever integrated, its
  credentials belong in `.env.example`/`env.server.ts` at that point, as `SECRET` server-only
  variables — don't pre-add unused placeholder vars for a feature that doesn't exist; it's a false
  signal that something is configured when nothing reads it (this is exactly what the previous
  version of `.env.example` did with `BKASH_APP_KEY`/`NAGAD_MERCHANT_ID`/`SSLCOMMERZ_STORE_ID` and
  friends — removed for this reason).
- **WhatsApp**: the support number is DB-backed (`settings.whatsappNumber`, editable at
  `/admin/settings`, read via `getPublicSettings()` in `src/lib/settings.ts`) so it can change
  without a redeploy — deliberately not an env var. `siteConfig.links.whatsapp` is only a
  hardcoded fetch-failure fallback. Don't add a `WHATSAPP_NUMBER` env var; update the number from
  the admin settings page instead.

## Custom domain

Prerequisite: the domain must already be an active zone on this Cloudflare account (Cloudflare
manages its DNS) — a domain registered elsewhere with DNS still pointed at the registrar won't
work.

**Dashboard**: Workers & Pages → digitalsubsbd → Settings → Domains & Routes → Add → Custom
Domain → enter the domain. Cloudflare provisions the DNS record and TLS certificate automatically.

**Or via `wrangler.jsonc`** (equivalent, versioned in git instead of a dashboard click):

```jsonc
{
  // ...existing config...
  "routes": [{ "pattern": "digitalsubsbd.com", "custom_domain": true }],
}
```

then `npm run deploy`. You can't attach a Custom Domain to a hostname that already has a CNAME
record pointed elsewhere — remove any conflicting DNS record first.

After attaching a custom domain, update `NEXT_PUBLIC_SITE_URL` to match and rebuild/redeploy (see
[Environment variables](#environment-variables) above — this value is both build-time-inlined
*and* read at runtime, so both the build and the deployed Worker's secret need updating), and add
the new domain to Supabase's allowed redirect URLs (next section).

## Supabase configuration

No code changes are needed for Supabase to work on Cloudflare — `@supabase/supabase-js` and
`@supabase/ssr` are fetch-based, and every Supabase client factory in this repo
(`src/lib/supabase/{admin,server,static}.ts`) already creates a fresh client per call rather than
caching one at module scope, which is specifically the pattern Cloudflare's own OpenNext
troubleshooting docs call out as required — a client that tries to reuse a connection across
requests hits `"Cannot perform I/O on behalf of a different request"` in the Workers runtime. This
app was already written the safe way; nothing to change here for the Cloudflare move itself.

What genuinely needs updating once you have a production domain:

1. **Supabase dashboard → Authentication → URL Configuration**:
   - **Site URL**: your production `NEXT_PUBLIC_SITE_URL`.
   - **Redirect URLs**: add `https://<your-domain>/reset-password` (used by
     `forgotPasswordAction`) and any other auth-flow URLs. Leaving only `localhost` here means
     password-reset emails in production link somewhere Supabase will refuse to redirect to.
2. **`SUPABASE_SERVICE_ROLE_KEY`** — set as a Worker secret (above), never as a `NEXT_PUBLIC_*`
   var, never in `wrangler.jsonc`'s plaintext `vars`. This was already a hard rule in this repo's
   CLAUDE.md before the Cloudflare work; nothing about deploying here changes or weakens it — the
   service-role key still never reaches the browser, and now also never reaches the *build*
   output (it's a runtime-only secret, not `NEXT_PUBLIC_*`, so it's never inlined into client JS
   in the first place).
3. Nothing about RLS, the `is_staff()`/`is_admin()` helper functions, or any Postgres function
   needs to change for Cloudflare specifically — those are enforced at the database layer
   regardless of which platform runs the Next.js app.

## Troubleshooting

**`npm run typecheck` (or `next dev`/`next build`) hangs with no output.**
Check `next.config.ts` doesn't have `initOpenNextCloudflareForDev()` re-added — see [Why `next
dev` doesn't simulate Cloudflare bindings](#why-next-dev-doesnt-simulate-cloudflare-bindings). This
already happened once while setting this config up.

**Deploy fails with a Worker size error (3 MiB or 10 MiB limit).**
3 MiB is the Workers Free plan limit; Paid raises it to 10 MiB. If you hit the 10 MiB Paid limit,
run `npm run cf:build` and inspect `.open-next/worker.js`'s size / use an ESBuild bundle analyzer
against it to find what's bloating it — a large unused dependency pulled transitively is the usual
cause, not applicable to any Node builtin issue.

**A third-party npm package fails to import at build/runtime with an odd resolution error.**
Almost always a missing `nodejs_compat` compatibility flag or a `compatibility_date` before
`2024-09-23` — this repo's `wrangler.jsonc` already has both satisfied
(`compatibility_date: "2026-09-01"`, flags include `nodejs_compat`). If a *new* dependency added
later hits this, first confirm those two are still correct before assuming the package is simply
incompatible.

**`"Cannot perform I/O on behalf of a different request"` error at runtime.**
A database/HTTP client was instantiated once at module scope and reused across requests instead of
created fresh per call. Not currently present anywhere in this codebase (see [Supabase
configuration](#supabase-configuration) above) — if you add a new external client (a payment
gateway SDK, when one of the bKash/Nagad/SSLCommerz integrations is eventually built), create it
inside the function that uses it, the same way every `createXSupabaseClient()` factory here does.

**Local `wrangler dev`/`npm run preview` logs a warning about Durable Objects "not working in
local development."**
Expected and safe to ignore per Cloudflare's own known-issues docs — the caching Durable Objects
aren't exercised by the build process itself, only at actual request time, and they do work
correctly once deployed.

**Images aren't being resized, just served at original size.**
Either the `images.binding: "IMAGES"` block was removed from `wrangler.jsonc`, or Cloudflare Images
isn't enabled on the account — see [Image optimization](#image-optimization-the-images-binding)
above. This is a degradation, not a bug; the app still functions.

**A `revalidatePath()` call (e.g. editing a category in `/admin/categories`) doesn't seem to
update `/categories` after deploying.**
Confirm the KV namespace exists and `wrangler.jsonc`'s `kv_namespaces[0].id` is the real id (not
still the `REPLACE_WITH_REAL_KV_NAMESPACE_ID` placeholder), and that the three Durable Object
bindings in `wrangler.jsonc` matched what actually got deployed — check the Cloudflare dashboard's
Durable Objects tab for `DOQueueHandler`/`DOShardedTagCache`/`BucketCachePurge` under this Worker.
A `wrangler deploy --dry-run` (no actual deploy) will list every binding wrangler resolved without
error, which is a fast way to confirm the config itself parses correctly before trying a real
deploy — note it does **not** verify a KV/R2 resource actually exists, only that the binding is
syntactically well-formed; a placeholder id passes `--dry-run` and only fails on a real deploy.
Also remember KV is eventually consistent (see [Caching
architecture](#caching-architecture-why-this-app-needs-kv--three-durable-objects) above) — a short
delay after a `revalidatePath()` call before the change is visible everywhere is expected, not a
bug.

**Deploy fails with `403 "Please enable R2 through the Cloudflare Dashboard"`.**
Only relevant if you've switched this app back to the R2 incremental cache (see the "Why KV, not
R2" note above) — R2 needs a one-time account-level activation (Cloudflare dashboard → Storage &
Databases → R2 → enable) before `wrangler r2 bucket create`/`opennextjs-cloudflare deploy`'s own
bucket auto-provisioning can succeed. This is exactly the error that drove this app off R2 and
onto KV in the first place.

**Environment variable seems to have the right value locally but the wrong (or missing) value in
production.**
Re-read [Environment variables](#environment-variables) above — build-time (`NEXT_PUBLIC_*`,
baked from whatever ran the build) and runtime (`wrangler secret put`, read fresh per Worker
isolate) are two different mechanisms with two different places to fix a wrong value. Getting the
right value into `.env.local` only fixes the build-time half.
