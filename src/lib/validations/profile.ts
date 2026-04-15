import { z } from "zod";

export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_AVATAR_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const PROFILE_AVATAR_ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp";

export const profileSettingsSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .max(120, "Email liên hệ tối đa 120 ký tự")
    .refine(
      (value) => value.length === 0 || z.email().safeParse(value).success,
      "Email liên hệ không hợp lệ",
    )
    .transform((value) => value || null),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
