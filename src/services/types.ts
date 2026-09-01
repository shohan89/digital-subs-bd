import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Every service function takes the Supabase client as its first argument
 * instead of creating one internally. This keeps services agnostic of
 * *which* client (anon/server vs. service-role/admin) the caller needs,
 * and keeps them testable without mocking module-level singletons.
 *
 * Left untyped (no `<Database>` generic) until `src/types/database.types.ts`
 * is regenerated from the real schema — see the comment there. Query
 * results are `any` for now; the hand-written types in `src/types/*` are
 * what call sites should cast/validate against in the meantime.
 */
export type DbClient = SupabaseClient;
