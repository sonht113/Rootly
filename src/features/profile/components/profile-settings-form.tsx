"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Mail, ShieldCheck, Trash2, Upload, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { UploadDropzone } from "@/components/shared/upload-dropzone";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeProfileAvatarAction, updateProfileSettingsAction } from "@/features/profile/actions/profile";
import {
  PROFILE_AVATAR_ACCEPT_ATTRIBUTE,
  PROFILE_AVATAR_MAX_BYTES,
  getProfileAvatarValidationError,
} from "@/lib/validations/profile";
import { getProfileDisplay } from "@/lib/utils/profile";
import type { ProfileRow } from "@/types/domain";

interface ProfileSettingsFormProps {
  profile: ProfileRow;
}

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name);
  const [contactEmail, setContactEmail] = useState(profile.email ?? "");
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [isSaving, startSavingTransition] = useTransition();
  const [isRemovingAvatar, startRemovingAvatarTransition] = useTransition();
  const { displayName, initials, roleLabel } = getProfileDisplay({
    ...profile,
    full_name: fullName,
  });

  const previewUrl = useMemo(() => {
    if (!selectedAvatar) {
      return profile.avatar_url;
    }

    return URL.createObjectURL(selectedAvatar);
  }, [profile.avatar_url, selectedAvatar]);

  useEffect(() => {
    if (!selectedAvatar || !previewUrl || previewUrl === profile.avatar_url) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, profile.avatar_url, selectedAvatar]);

  function handleAvatarSelect(file: File | null) {
    if (!file) {
      setSelectedAvatar(null);
      return;
    }

    const validationError = getProfileAvatarValidationError(file);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSelectedAvatar(file);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startSavingTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("contactEmail", contactEmail.trim());

      if (selectedAvatar) {
        formData.set("avatar", selectedAvatar);
      }

      const result = await updateProfileSettingsAction(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSelectedAvatar(null);
      router.refresh();
    });
  }

  function handleRemoveAvatar() {
    if (selectedAvatar) {
      setSelectedAvatar(null);
      return;
    }

    startRemovingAvatarTransition(async () => {
      const result = await removeProfileAvatarAction();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSelectedAvatar(null);
      router.refresh();
    });
  }

  const isBusy = isSaving || isRemovingAvatar;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin hồ sơ</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-[160px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="flex justify-center md:justify-start">
                  <Avatar className="size-28 border border-[#dbe5f0] shadow-sm">
                    {previewUrl ? <AvatarImage src={previewUrl} alt={displayName} /> : null}
                    <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                </div>

                <UploadDropzone
                  accept={PROFILE_AVATAR_ACCEPT_ATTRIBUTE}
                  fileName={selectedAvatar?.name ?? null}
                  onSelect={handleAvatarSelect}
                  helperText={`JPG, PNG hoặc WebP. Tối đa ${Math.floor(PROFILE_AVATAR_MAX_BYTES / 1024 / 1024)} MB.`}
                  className="items-stretch px-4 py-5 text-left"
                />

                {(profile.avatar_url || selectedAvatar) ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isBusy}
                    onClick={handleRemoveAvatar}
                  >
                    {isRemovingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    {selectedAvatar ? "Bỏ ảnh đã chọn" : "Gỡ ảnh hiện tại"}
                  </Button>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-full-name">Họ và Tên</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
                    <Input
                      id="profile-full-name"
                      value={fullName}
                      disabled={isBusy}
                      className="pl-12"
                      onChange={(event) => setFullName(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-username">Username đăng nhập</Label>
                  <Input id="profile-username" value={profile.username} readOnly disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-role">Vai trò</Label>
                  <Input id="profile-role" value={roleLabel} readOnly disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-contact-email">Email liên hệ</Label>
                  <Input
                    id="profile-contact-email"
                    type="email"
                    value={contactEmail}
                    placeholder="you@example.com"
                    disabled={isBusy}
                    onChange={(event) => setContactEmail(event.target.value)}
                  />
                  <p className="text-xs leading-5 text-[color:var(--muted-foreground)]">
                    Email này dùng để liên hệ. Đăng nhập hiện tại vẫn theo username và mật khẩu.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="accent" disabled={isBusy}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nguyên tắc hồ sơ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
          <div className="rounded-[16px] bg-[color:var(--muted)] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 text-[color:var(--primary-strong)]" />
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">Giữ nguyên chiến lược đăng nhập hiện tại</p>
                <p className="mt-1">
                  Username là định danh chính cho flow đăng nhập hiện tại. Trang này cho phép cập nhật Họ và Tên, email liên hệ và avatar mà không làm lệch flow login.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[color:var(--border)] p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 text-[color:var(--primary-strong)]" />
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">Ảnh đại diện dùng bucket `avatars`</p>
                <p className="mt-1">
                  Mỗi lần thay ảnh, hệ thống sẽ tải ảnh mới lên trước rồi mới dọn ảnh cũ để tránh mất avatar đang dùng.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
