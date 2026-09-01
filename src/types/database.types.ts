/**
 * Placeholder for Supabase's generated schema types.
 *
 * Regenerate with the Supabase CLI once the schema is defined:
 *   npx supabase gen types typescript --project-id <project-id> --schema public > src/types/database.types.ts
 *
 * Domain types under `src/types/*` are hand-written and map onto these
 * generated `Row`/`Insert`/`Update` shapes — keep them in sync after regenerating.
 *
 * `Database` is intentionally left untyped (`Record<string, never>` tables)
 * until then: supabase-js's `.select("a, b, c")` result inference needs real
 * named columns to resolve anything — a loose `Record<string, any>` Row
 * collapses every query result to `{}`, which fails silently at every call
 * site instead of loudly. `src/services/types.ts` types `DbClient` as a
 * plain untyped `SupabaseClient` for the same reason: query results are
 * `any` until this file is regenerated, not a false promise of safety.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
