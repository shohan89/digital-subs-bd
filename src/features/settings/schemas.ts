import { z } from "zod";

export const generalSettingsSchema = z.object({
  storeName: z.string().min(2, "Store name is too short").max(80, "Store name is too long"),
  storeDescription: z.string().min(10, "Description is too short").max(500, "Description is too long"),
  supportEmail: z.string().email("Enter a valid email address"),
  supportPhone: z.string().max(30, "Too long").optional(),
  whatsappNumber: z
    .string()
    .min(8, "Enter a valid WhatsApp number")
    .max(20, "Too long")
    .regex(/^\d+$/, "Digits only, no spaces or symbols (e.g. 8801700000000)"),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

const paymentNumberField = z.string().min(5, "Enter a valid number").max(30, "Too long");

export const paymentSettingsSchema = z.object({
  bkashNumber: paymentNumberField,
  nagadNumber: paymentNumberField,
  rocketNumber: paymentNumberField,
});

export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>;

export const deliverySettingsSchema = z.object({
  defaultDeliveryTime: z.string().min(2, "Too short").max(120, "Too long"),
  supportHours: z.string().min(2, "Too short").max(120, "Too long"),
});

export type DeliverySettingsInput = z.infer<typeof deliverySettingsSchema>;

export const seoSettingsSchema = z.object({
  siteTitle: z.string().min(2, "Too short").max(80, "Too long"),
  metaDescription: z.string().min(10, "Too short").max(300, "Too long"),
  // A site-relative path ("/og.png") or an absolute URL — both valid, so this isn't `z.string().url()`.
  ogImage: z.string().min(1, "Required").max(500, "Too long"),
});

export type SeoSettingsInput = z.infer<typeof seoSettingsSchema>;

// Every field optional/empty-allowed — an admin may not have every social platform, and an empty
// string means "don't show this icon" (see `Footer`'s render logic) rather than an error.
const optionalUrlField = z.union([z.literal(""), z.string().url("Enter a valid URL")]);

export const socialSettingsSchema = z.object({
  facebook: optionalUrlField,
  instagram: optionalUrlField,
  youtube: optionalUrlField,
  whatsapp: optionalUrlField,
});

export type SocialSettingsInput = z.infer<typeof socialSettingsSchema>;
