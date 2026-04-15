import { PageHeader } from "@/components/shared/page-header";
import { QuestionBankManager } from "@/features/exams/components/question-bank-manager";
import { TeacherExamsPanel } from "@/features/exams/components/teacher-exams-panel";
import { getExamManagementOverview } from "@/server/repositories/exams-repository";

export default async function TeacherExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const [{ questionBankItems, exams, classes }, resolvedSearchParams] = await Promise.all([
    getExamManagementOverview(),
    searchParams,
  ]);
  const initialClassId =
    typeof resolvedSearchParams.classId === "string" && classes.some((classItem) => classItem.id === resolvedSearchParams.classId)
      ? resolvedSearchParams.classId
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Kỳ thi"
        title="Quản lý kỳ thi"
        description="Tạo ngân hàng câu hỏi riêng cho phần assessment, ghép câu thành đề thi và phát hành khi bộ đề đã sẵn sàng."
      />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <QuestionBankManager items={questionBankItems} />
        <TeacherExamsPanel exams={exams} classes={classes} initialClassId={initialClassId} />
      </div>
    </div>
  );
}
