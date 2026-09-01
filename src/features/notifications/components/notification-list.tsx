"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { deleteNotificationAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/notifications.actions";
import { Button } from "@/components/ui/button";
import { NOTIFICATION_TYPE_ICON } from "@/constants/notifications";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/format-date";
import type { Notification } from "@/types/notification";

/**
 * The full `/dashboard/notifications` list — a client component so mark-as-read/delete/mark-all-
 * read can update instantly without a full page reload, same optimistic-local-state approach as
 * `NotificationBell`. No `router.refresh()` after a mutation: deleting/reading a notification is
 * low-stakes (unlike a review or product delete elsewhere in this app), so there's no confirmation
 * step either — a wrong click just costs re-reading a notification, not lost business data.
 */
export function NotificationList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleMarkRead(notification: Notification) {
    if (notification.read) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    await markNotificationReadAction({ notificationId: notification.id });
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsReadAction();
  }

  async function handleDelete(notification: Notification) {
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    await deleteNotificationAction({ notificationId: notification.id });
  }

  if (notifications.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </p>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {notifications.map((notification) => {
          const Icon = NOTIFICATION_TYPE_ICON[notification.type];
          return (
            <li
              key={notification.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border/60 p-4",
                !notification.read && "bg-primary/5",
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" aria-hidden="true" />
              </div>

              <button
                type="button"
                onClick={() => handleMarkRead(notification)}
                className="flex-1 text-left"
                disabled={notification.read}
              >
                <div className="flex items-center gap-1.5">
                  {!notification.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                  <span className="text-sm font-medium">{notification.title}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
                <span className="mt-1 block text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</span>
              </button>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete notification"
                onClick={() => handleDelete(notification)}
                className="shrink-0"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
