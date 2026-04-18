import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassExamsPanel } from "@/features/classes/components/class-exams-panel";
import { StudentClassLessonsPanel } from "@/features/classes/components/class-lessons-panel";
import { ClassSuggestionsPanel } from "@/features/classes/components/class-suggestions-panel";
import { getStudentClassDetailView } from "@/server/services/classes-service";

export default async function StudentClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const view = await getStudentClassDetailView(classId);

  if (!view) {
    notFound();
  }

  const { classItem, assignments, exams, lessons } = view;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Lớp học"
        title={classItem.name}
        description={classItem.description ?? "Theo dõi bài tập từ giáo viên và các kỳ thi được giao riêng cho lớp này."}
        badgeText={`${classItem.memberCount} thành viên`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Thành viên</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{classItem.memberCount}</p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Tổng số người đang tham gia lớp học này.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bài tập chờ nhận</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{classItem.pendingAssignmentCount}</p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Trong tổng số {classItem.assignmentCount} gợi ý mà giáo viên đã giao cho lớp.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kỳ thi đang mở</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{classItem.openExamCount}</p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Trong tổng số {classItem.examCount} kỳ thi dành riêng cho lớp này.
            </p>
          </CardContent>
        </Card>
      </div>

      <StudentClassLessonsPanel lessons={lessons} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ClassSuggestionsPanel
          suggestions={assignments}
          title="Bài tập từ giáo viên"
          description="Các gợi ý từ gốc dành riêng cho lớp này. Bạn có thể nhận vào lịch cá nhân khi sẵn sàng học."
          emptyMessage="Giáo viên chưa giao bài tập nào cho lớp này."
          showClassName={false}
        />

        <ClassExamsPanel
          title="Kỳ thi của lớp"
          description="Xem các kỳ thi giáo viên đã phát hành cho lớp, trạng thái làm bài hiện tại và mở nhanh vào đề thi."
          emptyMessage="Chưa có kỳ thi nào dành riêng cho lớp này."
          audience="student"
          exams={exams}
          hrefBuilder={(examId) => `/exams/${examId}`}
        />
      </div>
    </div>
  );
}
