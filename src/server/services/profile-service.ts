import { randomUUID } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/supabase/env";
import { getFileExtension, extractPublicStorageObjectPath } from "@/lib/utils/public-storage";
import { getProfileAvatarValidationError } from "@/lib/validations/profile";
import { getCurrentProfileForSettings, updateCurrentProfileRecord } from "@/server/repositories/profile-repository";
import type { ProfileRow } from "@/types/domain";

function validateAvatarFile(file: File) {
  const validationError = getProfileAvatarValidationError(file);

  if (validationError) {
    throw new Error(validationError);
  }
}

function buildAvatarObjectPath(profile: ProfileRow, file: File) {
  const extension = getFileExtension(file.name, file.type);
  const timestamp = Date.now();

  return `${profile.auth_user_id}/${timestamp}-${randomUUID()}.${extension}`;
}

async function uploadAvatar(file: File, profile: ProfileRow) {
  validateAvatarFile(file);

  const admin = getSupabaseAdmin();
  const env = getServerEnv();
  const objectPath = buildAvatarObjectPath(profile, file);
  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage.from(env.SUPABASE_AVATAR_BUCKET).upload(objectPath, fileBuffer, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || "Không thể tải ảnh đại diện lên");
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(env.SUPABASE_AVATAR_BUCKET).getPublicUrl(objectPath);

  return {
    objectPath,
    publicUrl,
  };
}

async function removePreviousAvatar(avatarUrl: string | null) {
  const normalizedUrl = avatarUrl?.trim();

  if (!normalizedUrl) {
    return;
  }

  const env = getServerEnv();
  const objectPath = extractPublicStorageObjectPath(normalizedUrl, {
    baseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    bucket: env.SUPABASE_AVATAR_BUCKET,
  });

  if (!objectPath) {
    return;
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(env.SUPABASE_AVATAR_BUCKET).remove([objectPath]);

  if (error) {
    throw new Error(error.message || "Không thể gỡ ảnh đại diện cũ");
  }
}

async function removeAvatarByObjectPath(objectPath: string) {
  const env = getServerEnv();
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(env.SUPABASE_AVATAR_BUCKET).remove([objectPath]);

  if (error) {
    throw new Error(error.message || "Không thể dọn ảnh đại diện đã tải lên");
  }
}

export async function updateCurrentProfileSettings(input: {
  fullName: string;
  contactEmail: string | null;
  avatarFile?: File | null;
}) {
  const currentProfile = await getCurrentProfileForSettings();
  let nextAvatarUrl = currentProfile.avatar_url;
  let uploadedAvatar: { objectPath: string; publicUrl: string } | null = null;

  try {
    if (input.avatarFile && input.avatarFile.size > 0) {
      uploadedAvatar = await uploadAvatar(input.avatarFile, currentProfile);
      nextAvatarUrl = uploadedAvatar.publicUrl;
    }

    const updatedProfile = await updateCurrentProfileRecord({
      full_name: input.fullName,
      email: input.contactEmail,
      avatar_url: nextAvatarUrl,
    });

    if (
      input.avatarFile &&
      input.avatarFile.size > 0 &&
      currentProfile.avatar_url &&
      currentProfile.avatar_url !== updatedProfile.avatar_url
    ) {
      void removePreviousAvatar(currentProfile.avatar_url).catch(() => undefined);
    }

    return updatedProfile;
  } catch (error) {
    if (uploadedAvatar) {
      void removeAvatarByObjectPath(uploadedAvatar.objectPath).catch(() => undefined);
    }

    throw error;
  }
}

export async function removeCurrentProfileAvatar() {
  const currentProfile = await getCurrentProfileForSettings();

  if (!currentProfile.avatar_url) {
    return currentProfile;
  }

  const updatedProfile = await updateCurrentProfileRecord({
    avatar_url: null,
  });

  void removePreviousAvatar(currentProfile.avatar_url).catch(() => undefined);

  return updatedProfile;
}
