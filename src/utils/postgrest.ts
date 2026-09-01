/**
 * Escapes a value for safe interpolation into a PostgREST `.or()` filter string — wraps it in
 * double quotes (PostgREST's documented escape for values containing the DSL's own special
 * characters: `,`, `.`, `(`, `)`) and backslash-escapes any literal quote/backslash in the value
 * itself. Without this, a search term containing a comma could inject an unrelated extra filter
 * condition into the query, not just fail to match — this isn't just a correctness nicety.
 *
 * Shared by every admin list whose search runs through `.or()` (`orders.service.ts`,
 * `subscriptions.service.ts`) — a single copy so a future fix to the escaping logic can't drift
 * between call sites.
 */
export function escapeOrFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
