import { format, formatDistanceToNow } from "date-fns";

/** e.g. formatDate("2026-08-27T00:00:00Z") -> "27 Aug 2026" */
export function formatDate(date: string | Date, pattern = "d MMM yyyy"): string {
  return format(typeof date === "string" ? new Date(date) : date, pattern);
}

/** e.g. formatRelativeTime("2026-08-27T00:00:00Z") -> "2 hours ago" */
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(typeof date === "string" ? new Date(date) : date, { addSuffix: true });
}
