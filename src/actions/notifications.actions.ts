"use server";

import { deleteNotificationSchema, markNotificationReadSchema } from "@/features/notifications/schemas";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notificationsService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";
import type { Notification } from "@/types/notification";

const RECENT_NOTIFICATIONS_LIMIT = 20;

/**
 * Called from `NotificationBell` (a Client Component in `Navbar`, mounted on every marketing/
 * dashboard page) on mount — not a Server Component fetch, deliberately: `Navbar`'s layouts wrap
 * `/category/[slug]`, the one statically-generated page in this app, and adding a `cookies()` call
 * (which `createServerSupabaseClient` uses) to that layout would silently break its static
 * generation. A Server Action invoked client-side after hydration has no such effect.
 */
export async function getNotificationsAction(): Promise<ActionResult<Notification[]>> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  try {
    const notifications = await notificationsService.listNotificationsForUser(supabase, user.id, {
      limit: RECENT_NOTIFICATIONS_LIMIT,
    });
    return actionSuccess(notifications);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not load notifications");
  }
}

export async function markNotificationReadAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = markNotificationReadSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    await notificationsService.markNotificationRead(supabase, parsed.data.notificationId, user.id);
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not update notification");
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  try {
    await notificationsService.markAllNotificationsRead(supabase, user.id);
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not update notifications");
  }
}

export async function deleteNotificationAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = deleteNotificationSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    await notificationsService.deleteNotification(supabase, parsed.data.notificationId, user.id);
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not delete this notification");
  }
}
