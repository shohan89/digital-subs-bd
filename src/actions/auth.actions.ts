"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { forgotPasswordSchema, loginSchema, registerSchema } from "@/features/auth/schemas";
import { authService } from "@/services";
import { checkRateLimit, rateLimitErrorMessage, rateLimitKeyByEmail, rateLimitKeyByIp } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";

/** Only accept an internal path (`/dashboard`, not `https://evil.example`) as a post-login target. */
function safeRedirectTarget(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function loginAction(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  // Two independent buckets — by email (credential stuffing against one account, from any/many
  // IPs) and by IP (one source hammering many accounts). Either one tripping blocks the attempt;
  // both are checked before the real `signInWithPassword` call, not after, so a blocked attempt
  // never even reaches Supabase Auth.
  const emailLimit = await checkRateLimit(rateLimitKeyByEmail("login", parsed.data.email), { limit: 8, windowSeconds: 15 * 60 });
  if (!emailLimit.allowed) return actionError(rateLimitErrorMessage(emailLimit.retryAfterSeconds));
  const ipLimit = await checkRateLimit(await rateLimitKeyByIp("login"), { limit: 20, windowSeconds: 15 * 60 });
  if (!ipLimit.allowed) return actionError(rateLimitErrorMessage(ipLimit.retryAfterSeconds));

  const supabase = await createServerSupabaseClient();
  let userId: string;
  try {
    const { user } = await authService.signInWithPassword(supabase, parsed.data.email, parsed.data.password);
    userId = user.id;
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not sign in");
  }

  // Honor `?redirectTo=` (set by middleware when it bounced an unauthenticated request off a
  // protected route) over the role-based default — `requireUser`/`requireStaff`/`requireAdmin`
  // re-check access on arrival either way, so this is a UX convenience, not a trust decision.
  const redirectTarget = safeRedirectTarget(formData.get("redirectTo"));
  if (redirectTarget) redirect(redirectTarget);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  const isStaff = profile?.role === "admin" || profile?.role === "manager";
  redirect(isStaff ? ROUTES.adminDashboard : ROUTES.dashboard);
}

export async function registerAction(
  _prevState: ActionResult<{ requiresEmailConfirmation: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ requiresEmailConfirmation: boolean }>> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  // By IP, not email — a new email is expected every time here, so an email-keyed bucket would
  // never accumulate; the abuse this guards against is one source mass-creating accounts.
  const ipLimit = await checkRateLimit(await rateLimitKeyByIp("register"), { limit: 10, windowSeconds: 60 * 60 });
  if (!ipLimit.allowed) return actionError(rateLimitErrorMessage(ipLimit.retryAfterSeconds));

  const supabase = await createServerSupabaseClient();
  let hasSession: boolean;
  try {
    const { session } = await authService.signUpWithPassword(supabase, {
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || undefined,
    });
    hasSession = session !== null;
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not create account");
  }

  // If the Supabase project requires email confirmation, `signUp` succeeds but returns no
  // session yet — redirecting to a protected route here would just bounce straight back to
  // /login. Surface that state to the form instead of redirecting.
  if (!hasSession) {
    return actionSuccess({ requiresEmailConfirmation: true });
  }

  const redirectTarget = safeRedirectTarget(formData.get("redirectTo"));
  redirect(redirectTarget ?? ROUTES.dashboard);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await authService.signOut(supabase);
  redirect(ROUTES.login);
}

export async function forgotPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  // By email — the abuse this guards against (email-bombing one target address with reset
  // requests) is defined by the *target*, not the source; an attacker rotating IPs against the
  // same address is still caught here.
  const emailLimit = await checkRateLimit(rateLimitKeyByEmail("forgot-password", parsed.data.email), { limit: 5, windowSeconds: 60 * 60 });
  if (!emailLimit.allowed) return actionError(rateLimitErrorMessage(emailLimit.retryAfterSeconds));

  const supabase = await createServerSupabaseClient();
  try {
    await authService.sendPasswordResetEmail(
      supabase,
      parsed.data.email,
      `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    );
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not send reset email");
  }

  return actionSuccess(undefined);
}
