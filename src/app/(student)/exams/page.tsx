import { PageHeader } from "@/components/shared/page-header";
import { ExamsList } from "@/features/exams/components/exams-list";
import { getAccessibleExamsForCurrentUser } from "@/server/repositories/exams-repository";

export default async function ExamsPage() {
  const exams = await getAccessibleExamsForCurrentUser();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Kỳ thi"
        title="Danh sách kỳ thi"
        description="Theo dõi các kỳ thi đang mở, xem trạng thái làm bài của bạn và quay lại các bài đã nộp để xem kết quả."
      />

      <ExamsList exams={exams} />
    </div>
  );
}
