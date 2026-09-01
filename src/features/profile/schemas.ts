import { z } from "zod";

import { BD_PHONE_ERROR_MESSAGE, BD_PHONE_REGEX } from "@/lib/validation";

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is too short"),
  phone: z.string().regex(BD_PHONE_REGEX, BD_PHONE_ERROR_MESSAGE).optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
