import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { NotificationList } from "@/features/notifications/components";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notificationsService } from "@/services";
import type { Notification } from "@/types/notification";

export const metadata: Metadata = { title: "Notifications" };

const PER_PAGE = 20;

function buildPageHref(page: number): string {
  return page > 1 ? `${ROUTES.dashboardNotifications}?page=${page}` : ROUTES.dashboardNotifications;
}

export default async function DashboardNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  let notifications: Notification[] = [];
  let hasMore = false;
  let loadError = false;
  try {
    const supabase = await createServerSupabaseClient();
    const offset = (page - 1) * PER_PAGE;
    // Fetch one extra row to know whether a "Next" page exists — same convention as the admin
    // list pages (e.g. `/admin/orders`).
    const fetched = await notificationsService.listNotificationsForUser(supabase, user.id, {
      limit: PER_PAGE + 1,
      offset,
    });
    hasMore = fetched.length > PER_PAGE;
    notifications = fetched.slice(0, PER_PAGE);
  } catch (error) {
    unstable_rethrow(error);
    loadError = true;
  }

  return (
    <main className="flex-1 p-8">
      <h1 className="text-xl font-semibold">Notifications</h1>

      {loadError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>Couldn&apos;t load your notifications right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <>
          <NotificationList initialNotifications={notifications} />

          {(page > 1 || hasMore) && (
            <nav aria-label="Pagination" className="mt-6 flex justify-center gap-2">
              {page > 1 && (
                <Button asChild variant="outline">
                  <Link href={buildPageHref(page - 1)}>Previous</Link>
                </Button>
              )}
              {hasMore && (
                <Button asChild variant="outline">
                  <Link href={buildPageHref(page + 1)}>Next</Link>
                </Button>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
