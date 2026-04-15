"use server";

import { revalidatePath } from "next/cache";

import { profileSettingsSchema } from "@/lib/validations/profile";
import { removeCurrentProfileAvatar, updateCurrentProfileSettings } from "@/server/services/profile-service";

function revalidateProfileShell() {
  revalidatePath("/profile");
  revalidatePath("/", "layout");
}

export async function updateProfileSettingsAction(formData: FormData) {
  const parsed = profileSettingsSchema.safeParse({
    contactEmail: formData.get("contactEmail"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Thông tin hồ sơ chưa hợp lệ.",
    };
  }

  const avatar = formData.get("avatar");

  try {
    await updateCurrentProfileSettings({
      contactEmail: parsed.data.contactEmail,
      avatarFile: avatar instanceof File ? avatar : null,
    });

    revalidateProfileShell();

    return {
      success: true,
      message: "Đã cập nhật hồ sơ.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.",
    };
  }
}

export async function removeProfileAvatarAction() {
  try {
    await removeCurrentProfileAvatar();
    revalidateProfileShell();

    return {
      success: true,
      message: "Đã gỡ ảnh đại diện.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể gỡ ảnh đại diện.",
    };
  }
}
