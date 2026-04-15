import { PageHeader } from "@/components/shared/page-header";
import { ExamEditor } from "@/features/exams/components/exam-editor";
import { getExamEditorData } from "@/server/repositories/exams-repository";

export default async function TeacherExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const data = await getExamEditorData(examId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Kỳ thi"
        title={data.exam.title}
        description="Cập nhật metadata, ghép câu hỏi từ ngân hàng và chuyển trạng thái kỳ thi theo đúng vòng đời draft -> published -> closed."
        badgeText={data.exam.status === "draft" ? "Nháp" : data.exam.status === "published" ? "Đang phát hành" : "Đã đóng"}
      />

      <ExamEditor
        exam={data.exam}
        questions={data.questions}
        questionBankItems={data.questionBankItems}
        classes={data.classes}
      />
    </div>
  );
}
