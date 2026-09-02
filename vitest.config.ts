import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests only, for the app's pure business-logic functions (subscription/order/coupon status
// derivation, timezone math, PostgREST filter escaping) — the exact kind of logic that already
// caused one real, subtle production bug this app shipped with (see utils/timezone.ts's doc
// comment). No React Testing Library / jsdom setup here on purpose: nothing yet under test renders
// a component, so paying that startup cost for every test file would be pure overhead. Add it if a
// future test genuinely needs to render something.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
