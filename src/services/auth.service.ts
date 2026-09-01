import type { DbClient } from "@/services/types";

export async function signInWithPassword(db: DbClient, email: string, password: string) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(
  db: DbClient,
  input: { email: string; password: string; fullName: string; phone?: string },
) {
  const { data, error } = await db.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName, phone: input.phone } },
  });
  if (error) throw error;
  return data;
}

export async function signOut(db: DbClient) {
  const { error } = await db.auth.signOut();
  if (error) throw error;
}

/** Updates `profiles` only — not `auth.users.email`, which Supabase Auth requires a separate
 * confirmation-email flow to change safely. Email stays read-only in the profile UI for that
 * reason; this only ever touches `full_name`/`phone`. */
export async function updateProfile(db: DbClient, userId: string, input: { fullName: string; phone: string }) {
  const { data, error } = await db
    .from("profiles")
    .update({ full_name: input.fullName, phone: input.phone || null })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(db: DbClient, email: string, redirectTo: string) {
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}
