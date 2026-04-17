import { z } from "zod";

import { fullNameSchema } from "@/lib/validations/profile-name";

export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_AVATAR_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const PROFILE_AVATAR_ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp";

export function getProfileAvatarValidationError(file: { type: string; size: number }) {
  if (!PROFILE_AVATAR_ACCEPTED_TYPES.includes(file.type as (typeof PROFILE_AVATAR_ACCEPTED_TYPES)[number])) {
    return "Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WebP.";
  }

  if (file.size > PROFILE_AVATAR_MAX_BYTES) {
    return "Ảnh đại diện tối đa 2 MB.";
  }

  return null;
}

export const profileSettingsSchema = z.object({
  fullName: fullNameSchema,
  contactEmail: z
    .string()
    .trim()
    .max(120, "Email liên hệ tối đa 120 ký tự")
    .refine((value) => value.length === 0 || z.email().safeParse(value).success, "Email liên hệ không hợp lệ")
    .transform((value) => value || null),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
