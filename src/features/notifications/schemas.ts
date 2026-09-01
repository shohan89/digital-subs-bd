import { z } from "zod";

export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
});

export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;

export const deleteNotificationSchema = z.object({
  notificationId: z.string().uuid(),
});

export type DeleteNotificationInput = z.infer<typeof deleteNotificationSchema>;
