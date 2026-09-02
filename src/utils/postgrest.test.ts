import { describe, expect, it } from "vitest";

import { escapeOrFilterValue } from "@/utils/postgrest";

describe("escapeOrFilterValue", () => {
  it("wraps a plain value in double quotes", () => {
    expect(escapeOrFilterValue("hello")).toBe('"hello"');
  });

  it("escapes a comma — the DSL's condition separator — so it can't inject an extra filter", () => {
    // Without escaping, a search for `foo,and(status.eq.pending)` could smuggle in a second
    // condition rather than just fail to match "foo,and(status.eq.pending)" literally.
    const result = escapeOrFilterValue("foo,and(status.eq.pending)");
    expect(result).toBe('"foo,and(status.eq.pending)"');
    // The whole thing must stay inside one pair of quotes — the DSL only treats a comma as a
    // separator outside of quotes.
    expect(result.startsWith('"')).toBe(true);
    expect(result.endsWith('"')).toBe(true);
  });

  it("backslash-escapes a literal double quote in the value", () => {
    expect(escapeOrFilterValue('say "hi"')).toBe('"say \\"hi\\""');
  });

  it("backslash-escapes a literal backslash in the value", () => {
    expect(escapeOrFilterValue("C:\\path")).toBe('"C:\\\\path"');
  });

  it("escapes backslashes before quotes so an adversarial value can't uncomment its own escape", () => {
    // A value ending in a backslash immediately before the closing quote must not let that
    // backslash escape the closing quote itself.
    const result = escapeOrFilterValue('a\\"');
    expect(result).toBe('"a\\\\\\""');
  });
});
