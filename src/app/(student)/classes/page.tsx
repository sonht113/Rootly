import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Sparkles, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudentClassesOverview } from "@/server/services/classes-service";

export default async function StudentClassesPage() {
  const classes = await getStudentClassesOverview();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Lớp học"
        title="Các lớp bạn đang tham gia"
        description="Theo dõi bài tập giáo viên giao theo từng lớp và mở nhanh các kỳ thi dành riêng cho lớp của bạn."
      />

      {classes.length === 0 ? (
        <EmptyState
          title="Bạn chưa tham gia lớp nào"
          description="Khi giáo viên thêm bạn vào một lớp học, lớp đó sẽ xuất hiện ở đây cùng với bài tập và kỳ thi liên quan."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((classItem) => (
            <Card key={classItem.id}>
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle>{classItem.name}</CardTitle>
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      {classItem.description ?? "Lớp học này chưa có mô tả chi tiết."}
                    </p>
                  </div>
                  <Badge variant="outline">{classItem.memberCount} thành viên</Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-[color:var(--muted-foreground)]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1">
                    <Sparkles className="size-3.5" />
                    {classItem.pendingAssignmentCount}/{classItem.assignmentCount} bài tập chờ nhận
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1">
                    <ClipboardCheck className="size-3.5" />
                    {classItem.openExamCount}/{classItem.examCount} kỳ thi đang mở
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1">
                    <Users className="size-3.5" />
                    {classItem.memberCount} người học
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <Link
                  href={`/classes/${classItem.id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--primary-strong)]"
                >
                  Mở chi tiết lớp
                  <ArrowUpRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
