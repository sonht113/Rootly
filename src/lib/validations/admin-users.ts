import { z } from "zod";

const APP_ROLE_VALUES = ["student", "teacher", "admin"] as const;

function getSearchParamValue(value: unknown) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export const managedUserRoleSchema = z.enum(APP_ROLE_VALUES);

export const adminUsersSearchParamsSchema = z
  .object({
    q: z
      .preprocess(getSearchParamValue, z.string().trim().max(120).optional())
      .transform((value) => (value && value.length > 0 ? value : null)),
    role: z.preprocess(
      (value) => {
        const normalizedValue = getSearchParamValue(value);

        return typeof normalizedValue === "string" && normalizedValue.trim().length > 0 ? normalizedValue : undefined;
      },
      managedUserRoleSchema.optional(),
    ),
    page: z.preprocess(
      (value) => {
        const normalizedValue = getSearchParamValue(value);

        if (typeof normalizedValue !== "string" || normalizedValue.trim().length === 0) {
          return 1;
        }

        const parsedPage = Number(normalizedValue);
        return Number.isFinite(parsedPage) ? parsedPage : 1;
      },
      z.number().int().min(1),
    ),
  })
  .catch({
    q: null,
    role: undefined,
    page: 1,
  });

export const updateManagedUserRoleSchema = z.object({
  targetUserId: z.string().uuid(),
  nextRole: managedUserRoleSchema,
});

export const deleteManagedUserSchema = z.object({
  targetUserId: z.string().uuid(),
});
