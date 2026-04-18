"use client";

import Link from "next/link";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteManagedUserAction, updateManagedUserRoleAction } from "@/features/admin-users/actions/admin-users";
import { EmptyState } from "@/components/shared/empty-state";
import { getProfileDisplay, getProfileRoleLabel } from "@/lib/utils/profile";
import type { AppRole } from "@/types/domain";

interface AdminUsersManagerProps {
  currentAdminUserId: string;
  items: Array<{
    auth_user_id: string;
    username: string;
    full_name: string;
    email: string | null;
    avatar_url: string | null;
    role: AppRole;
    created_at: string;
  }>;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  query: string | null;
  role?: AppRole;
}

function formatCreatedAtLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function buildPaginationHref(input: {
  page: number;
  query: string | null;
  role?: AppRole;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.role) {
    params.set("role", input.role);
  }

  if (input.page > 1) {
    params.set("page", `${input.page}`);
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `/admin/users?${queryString}` : "/admin/users";
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
}

export function AdminUsersManager({
  currentAdminUserId,
  items,
  page,
  pageSize,
  totalCount,
  totalPages,
  query,
  role,
}: AdminUsersManagerProps) {
  const router = useRouter();
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole>>({});
  const visiblePageNumbers = useMemo(() => getVisiblePageNumbers(page, totalPages), [page, totalPages]);

  function handleRoleDraftChange(userId: string, nextRole: AppRole) {
    setRoleDrafts((current) => ({
      ...current,
      [userId]: nextRole,
    }));
  }

  function handleSaveRole(user: AdminUsersManagerProps["items"][number]) {
    const nextRole = roleDrafts[user.auth_user_id] ?? user.role;
    setPendingActionKey(`role:${user.auth_user_id}`);

    startTransition(async () => {
      const result = await updateManagedUserRoleAction({
        targetUserId: user.auth_user_id,
        nextRole,
      });

      if (!result.success) {
        toast.error(result.message);
        setPendingActionKey(null);
        return;
      }

      toast.success(result.message);
      router.refresh();
      setPendingActionKey(null);
    });
  }

  function handleDeleteUser(user: AdminUsersManagerProps["items"][number]) {
    setPendingActionKey(`delete:${user.auth_user_id}`);

    startTransition(async () => {
      const result = await deleteManagedUserAction({
        targetUserId: user.auth_user_id,
      });

      if (!result.success) {
        toast.error(result.message);
        setPendingActionKey(null);
        return;
      }

      toast.success(result.message);
      router.refresh();
      setPendingActionKey(null);
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Không tìm thấy người dùng phù hợp"
        description="Thử đổi bộ lọc vai trò hoặc từ khóa tìm kiếm để xem lại toàn bộ người dùng trong hệ thống."
        actionLabel="Xóa bộ lọc"
        actionHref="/admin/users"
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>Danh sách người dùng</CardTitle>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {totalCount} người dùng · Trang {page}/{totalPages}
          </p>
        </div>
        {(query || role) && (
          <Badge variant="outline">
            Bộ lọc đang bật
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="w-[260px]">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((user) => {
              const display = getProfileDisplay({
                full_name: user.full_name,
                username: user.username,
                role: user.role,
              });
              const draftRole = roleDrafts[user.auth_user_id] ?? user.role;
              const isCurrentAdmin = user.auth_user_id === currentAdminUserId;
              const isRoleDirty = draftRole !== user.role;
              const isRolePending = isPending && pendingActionKey === `role:${user.auth_user_id}`;
              const isDeletePending = isPending && pendingActionKey === `delete:${user.auth_user_id}`;

              return (
                <TableRow key={user.auth_user_id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10 border border-[color:var(--border)]">
                        {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={display.displayName} /> : null}
                        <AvatarFallback>{display.initials}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[color:var(--foreground)]">{display.displayName}</p>
                          {isCurrentAdmin ? <Badge variant="warning">Tài khoản hiện tại</Badge> : null}
                        </div>
                        <p className="text-sm text-[color:var(--muted-foreground)]">@{user.username}</p>
                        <p className="text-sm text-[color:var(--muted-foreground)]">
                          {user.email ?? "Không có email liên hệ"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant={user.role === "admin" ? "default" : user.role === "teacher" ? "success" : "outline"}>
                        {getProfileRoleLabel(user.role)}
                      </Badge>
                      <select
                        value={draftRole}
                        className="h-10 w-full rounded-[12px] border border-[color:var(--border)] bg-white px-3 text-sm"
                        disabled={isCurrentAdmin || isRolePending || isDeletePending}
                        onChange={(event) => handleRoleDraftChange(user.auth_user_id, event.target.value as AppRole)}
                      >
                        <option value="student">Học viên</option>
                        <option value="teacher">Giáo viên</option>
                        <option value="admin">Quản trị viên</option>
                      </select>
                    </div>
                  </TableCell>
                  <TableCell>{formatCreatedAtLabel(user.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isCurrentAdmin || !isRoleDirty || isDeletePending || isRolePending}
                        onClick={() => handleSaveRole(user)}
                      >
                        {isRolePending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Lưu role
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="danger" disabled={isCurrentAdmin || isRolePending || isDeletePending}>
                            {isDeletePending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            Xóa user
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa người dùng khỏi hệ thống?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tài khoản <strong>{display.displayName}</strong> sẽ bị xóa vĩnh viễn. Các dữ liệu liên kết
                              bằng cascade như lớp học, kỳ thi, tiến độ và avatar cũng có thể bị xóa theo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeletePending}>Hủy</AlertDialogCancel>
                            <AlertDialogAction disabled={isDeletePending} onClick={() => handleDeleteUser(user)}>
                              {isDeletePending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                              Xác nhận xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Đang hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} / {totalCount}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {page <= 1 ? (
                <Button type="button" variant="outline" disabled>
                  Trang trước
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href={buildPaginationHref({ page: page - 1, query, role })}>Trang trước</Link>
                </Button>
              )}

              {visiblePageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  asChild
                  variant={pageNumber === page ? "default" : "outline"}
                >
                  <Link href={buildPaginationHref({ page: pageNumber, query, role })}>{pageNumber}</Link>
                </Button>
              ))}

              {page >= totalPages ? (
                <Button type="button" variant="outline" disabled>
                  Trang sau
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href={buildPaginationHref({ page: page + 1, query, role })}>Trang sau</Link>
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
