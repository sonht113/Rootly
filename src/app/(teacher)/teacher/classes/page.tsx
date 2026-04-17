import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateClassForm } from "@/features/classes/components/class-manager";
import { getCurrentProfile } from "@/lib/auth/session";
import { getRoleClassDetailPath } from "@/lib/navigation/role-routes";
import { getTeacherClasses } from "@/server/repositories/classes-repository";

export default async function TeacherClassesPage() {
  const [classes, profile] = await Promise.all([getTeacherClasses(), getCurrentProfile()]);
  const classDetailRole = profile?.role ?? "teacher";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Giảng viên"
        title="Quản lý lớp học"
        description="Tạo lớp mới, theo dõi số thành viên, và truy cập nhanh bảng tiến độ cũng như ranking của từng lớp."
      />
      <CreateClassForm />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((classItem) => (
          <Card key={classItem.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{classItem.name}</CardTitle>
                  <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{classItem.description ?? "Chưa có mô tả."}</p>
                </div>
                <Badge variant="success">
                  <Users className="mr-1 size-3" />
                  {classItem.class_members?.[0]?.count ?? 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={getRoleClassDetailPath(classDetailRole, classItem.id)} className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--primary-strong)]">
                Xem chi tiết lớp
                <ArrowUpRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
