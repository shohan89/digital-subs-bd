"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";

import { deleteNotificationAction, getNotificationsAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/notifications.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/format-date";
import type { Notification } from "@/types/notification";

/**
 * Fetches via a Server Action on mount, not a Server Component prop — see the doc comment on
 * `getNotificationsAction` for why (this mounts inside `Navbar`, which wraps the one statically
 * generated page in this app; a `cookies()`-using Server Component fetch in that tree would
 * silently break its static generation). New notifications since mount only show up on the next
 * dropdown open/page load — there's no realtime push here, by design (out of scope for this pass).
 */
export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getNotificationsAction().then((result) => {
      if (cancelled) return;
      if (result.success) setNotifications(result.data);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleOpenNotification(notification: Notification) {
    if (notification.read) return;
    // Optimistic — the dropdown shouldn't wait on a round-trip just to dim one item.
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    await markNotificationReadAction({ notificationId: notification.id });
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsReadAction();
  }

  async function handleDelete(event: MouseEvent, notificationId: string) {
    // Stop the click from also bubbling into the `DropdownMenuItem`'s onSelect (mark-as-read).
    event.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    await deleteNotificationAction({ notificationId });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onSelect={() => handleOpenNotification(notification)}
                className={cn("flex items-start gap-1 whitespace-normal py-2", !notification.read && "bg-primary/5")}
              >
                <div className="flex-1">
                  <div className="flex w-full items-center gap-1.5">
                    {!notification.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                    <span className="text-sm font-medium">{notification.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                  <span className="text-[11px] text-muted-foreground">{formatRelativeTime(notification.createdAt)}</span>
                </div>
                <button
                  type="button"
                  aria-label="Delete notification"
                  onClick={(event) => handleDelete(event, notification.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </DropdownMenuItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator />
        <Link
          href={ROUTES.dashboardNotifications}
          onClick={() => setOpen(false)}
          className="block px-2 py-2 text-center text-xs font-medium text-primary hover:underline"
        >
          View all notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
