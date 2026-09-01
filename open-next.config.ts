// Cloudflare adapter config for `@opennextjs/cloudflare`. Used by the
// `cf:build`/`preview`/`deploy` npm scripts — does not affect `next dev`
// or `next build`. See CLOUDFLARE_DEPLOYMENT.md for the deployment workflow.
//
// Without these overrides, `defineCloudflareConfig()` defaults every one of incrementalCache/
// tagCache/queue/cachePurge to a no-op "dummy" implementation (verified in the adapter's own
// `config.js`) — every `revalidate = 3600` page would silently behave as fully dynamic instead of
// cached, and `revalidatePath()` (used by `categories.actions.ts` against the ISR `/categories`
// page) would have nothing to invalidate. The bindings these overrides read
// (`NEXT_INC_CACHE_R2_BUCKET`, the three Durable Object bindings) are declared in
// `wrangler.jsonc`.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { purgeCache } from "@opennextjs/cloudflare/overrides/cache-purge/index";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
  tagCache: doShardedTagCache({ baseShardSize: 12 }),
  cachePurge: purgeCache({ type: "durableObject" }),
});
