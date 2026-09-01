import type { NotificationType } from "@/constants/notifications";

/** System/admin-generated only — see `notifications` RLS: no customer INSERT policy exists. */
export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: NotificationType;
  /** Whatever row this notification is about — an order, subscription, or review id depending on
   * `type`. Deliberately untyped/no real FK (see the migration's doc comment); `null` for a
   * notification with no single backing row. */
  relatedId: string | null;
  createdAt: string;
  updatedAt: string;
};
