"use server";

import { revalidatePath } from "next/cache";

import { deleteManagedUserSchema, updateManagedUserRoleSchema } from "@/lib/validations/admin-users";
import { deleteManagedUser, updateManagedUserRole } from "@/server/services/admin-users-service";

export async function updateManagedUserRoleAction(input: unknown) {
  const parsed = updateManagedUserRoleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Không thể cập nhật vai trò người dùng.",
    };
  }

  try {
    const updatedUser = await updateManagedUserRole(parsed.data.targetUserId, parsed.data.nextRole);

    revalidatePath("/admin/users");

    return {
      success: true,
      message: `Đã cập nhật vai trò cho ${updatedUser.full_name}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể cập nhật vai trò người dùng.",
    };
  }
}

export async function deleteManagedUserAction(input: unknown) {
  const parsed = deleteManagedUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Không thể xóa người dùng.",
    };
  }

  try {
    const deletedUser = await deleteManagedUser(parsed.data.targetUserId);

    revalidatePath("/admin/users");

    return {
      success: true,
      message: `Đã xóa ${deletedUser.full_name} khỏi hệ thống.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể xóa người dùng.",
    };
  }
}
