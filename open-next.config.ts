// Cloudflare adapter config for `@opennextjs/cloudflare`. Used by the
// `cf:build`/`preview`/`deploy` npm scripts — does not affect `next dev`
// or `next build`. See CLOUDFLARE_DEPLOYMENT.md for the deployment workflow.
//
// Without these overrides, `defineCloudflareConfig()` defaults every one of incrementalCache/
// tagCache/queue/cachePurge to a no-op "dummy" implementation (verified in the adapter's own
// `config.js`) — every `revalidate = 3600` page would silently behave as fully dynamic instead of
// cached, and `revalidatePath()` (used by `categories.actions.ts` against the ISR `/categories`
// page) would have nothing to invalidate. The bindings these overrides read
// (`NEXT_INC_CACHE_KV`, the three Durable Object bindings) are declared in `wrangler.jsonc`.
//
// Incremental cache is KV-backed, not R2 — a deliberate choice, not the adapter's default. R2
// requires a one-time account-level product activation (accepting terms, and in practice a
// payment method on file even for free-tier usage) that this deployment's Cloudflare account
// hadn't done, which surfaced as a real deploy-time failure: `wrangler deploy` (via
// `opennextjs-cloudflare deploy`'s own bucket auto-provisioning step) failed with `403 "Please
// enable R2 through the Cloudflare Dashboard"`. KV needs no such account-level activation — it's
// included on the Workers Free plan by default — at the cost of being eventually consistent
// (a revalidated page can take a short while to propagate across edge locations, vs. R2's strong
// consistency) and a lower daily write quota (1,000 writes/day on Free, vs. R2's ~1M/month
// operations) — an acceptable trade for this app's traffic level. Switch back to
// `r2-incremental-cache` if R2 is ever enabled on the account and that consistency/quota
// difference starts to matter.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import { purgeCache } from "@opennextjs/cloudflare/overrides/cache-purge/index";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  queue: doQueue,
  tagCache: doShardedTagCache({ baseShardSize: 12 }),
  cachePurge: purgeCache({ type: "durableObject" }),
});
