import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { adminUsersSearchParamsSchema } from "@/lib/validations/admin-users";
import { requireRole } from "@/lib/auth/session";
import { getProfileRoleLabel } from "@/lib/utils/profile";
import { AdminUsersManager } from "@/features/admin-users/components/admin-users-manager";
import { getManagedUsersPage } from "@/server/repositories/admin-users-repository";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = adminUsersSearchParamsSchema.parse(await searchParams);
  const [currentAdmin, managedUsersPage] = await Promise.all([
    requireRole(["admin"]),
    getManagedUsersPage({
      query: params.q,
      role: params.role,
      page: params.page,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị"
        title="Quản lý người dùng"
        description="Xem toàn bộ người dùng hiện có trong hệ thống, điều chỉnh vai trò hoặc xóa tài khoản khỏi admin workspace."
        badgeText={`${managedUsersPage.totalCount} user`}
      />

      <form className="grid gap-3 rounded-[18px] border border-[color:var(--border)] bg-white p-4 md:grid-cols-[1fr_220px_auto_auto]">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Tìm theo họ tên, username hoặc email..."
          className="h-10 rounded-[12px] border border-[color:var(--border)] px-3 text-sm"
        />

        <select
          name="role"
          defaultValue={params.role ?? ""}
          className="h-10 rounded-[12px] border border-[color:var(--border)] px-3 text-sm"
        >
          <option value="">Tất cả vai trò</option>
          <option value="student">{getProfileRoleLabel("student")}</option>
          <option value="teacher">{getProfileRoleLabel("teacher")}</option>
          <option value="admin">{getProfileRoleLabel("admin")}</option>
        </select>

        <button type="submit" className="rounded-[12px] bg-[color:var(--primary)] px-4 text-sm font-semibold text-white">
          Lọc
        </button>

        <Button asChild variant="outline">
          <Link href="/admin/users">Xóa bộ lọc</Link>
        </Button>
      </form>

      <AdminUsersManager
        currentAdminUserId={currentAdmin.auth_user_id}
        items={managedUsersPage.items}
        page={managedUsersPage.page}
        pageSize={managedUsersPage.pageSize}
        totalCount={managedUsersPage.totalCount}
        totalPages={managedUsersPage.totalPages}
        query={params.q}
        role={params.role}
      />
    </div>
  );
}
