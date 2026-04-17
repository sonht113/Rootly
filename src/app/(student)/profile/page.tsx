import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileSettingsForm } from "@/features/profile/components/profile-settings-form";
import { getCurrentProfile } from "@/lib/auth/session";
import { getProfileDisplay } from "@/lib/utils/profile";
import { getProgressSummary, getCurrentStreak } from "@/server/repositories/study-repository";

export default async function ProfilePage() {
  const [profile, streak, progressSummary] = await Promise.all([
    getCurrentProfile(),
    getCurrentStreak(),
    getProgressSummary(),
  ]);

  if (!profile) {
    return null;
  }

  const { displayName } = getProfileDisplay(profile);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hồ sơ"
        title={displayName}
        description="Xem vai trò hiện tại, cập nhật Họ và Tên, email liên hệ và quản lý ảnh đại diện mà không làm lệch flow đăng nhập theo username."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Chuỗi hiện tại</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{streak}</p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Số ngày học liên tiếp được tính từ `study_sessions`.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Từ gốc đã học</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{progressSummary.totalRootWordsLearned}</p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Tổng số root word đã đi qua vòng học đầu tiên.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lượt ôn hoàn tất</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{progressSummary.totalReviewsCompleted}</p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Tổng số review đã hoàn tất từ dữ liệu lưu thực tế.</p>
          </CardContent>
        </Card>
      </div>

      <ProfileSettingsForm key={profile.updated_at} profile={profile} />
    </div>
  );
}
