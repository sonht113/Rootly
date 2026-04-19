import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExamAttemptRunner } from "@/features/exams/components/exam-attempt-runner";
import { ExamResultSummary } from "@/features/exams/components/exam-result-summary";
import { StartExamCard } from "@/features/exams/components/start-exam-card";
import {
  formatExamWindow,
  getExamAvailabilityBadgeVariant,
  getExamAvailabilityLabel,
  getExamAvailabilityState,
  getExamScopeLabel,
  isFinalizedExamAttemptStatus,
} from "@/lib/utils/exams";
import { getStudentExamDetail } from "@/server/repositories/exams-repository";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const { exam, attempt, questions, draftAnswers, runtime, leaderboard } = await getStudentExamDetail(examId);
  const availability = getExamAvailabilityState({
    exam,
    attemptStatus: attempt?.status ?? null,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Kỳ thi"
        title={exam.title}
        description={exam.description ?? "Xem phạm vi, thời gian mở đề và tiến độ làm bài của bạn."}
        action={<Badge variant={getExamAvailabilityBadgeVariant(availability)}>{getExamAvailabilityLabel(availability)}</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {attempt && isFinalizedExamAttemptStatus(attempt.status) ? (
            <ExamResultSummary examId={exam.id} attempt={attempt} leaderboard={leaderboard} />
          ) : attempt?.status === "started" ? (
            <ExamAttemptRunner
              examId={exam.id}
              attemptId={attempt.id}
              questions={questions}
              initialAnswers={draftAnswers}
              runtime={runtime}
            />
          ) : availability === "open" ? (
            <StartExamCard exam={exam} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Trạng thái kỳ thi</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                {availability === "upcoming"
                  ? "Kỳ thi chưa đến thời điểm mở đề. Hãy quay lại đúng khung giờ đã công bố."
                  : availability === "closed"
                    ? "Kỳ thi này đã đóng và hiện không nhận thêm lượt làm mới."
                    : "Kỳ thi hiện chưa sẵn sàng để bắt đầu."}
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin nhanh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[color:var(--muted-foreground)]">
            <InfoRow label="Phạm vi" value={`${getExamScopeLabel(exam.scope)}${exam.class_name ? ` | ${exam.class_name}` : ""}`} />
            <InfoRow label="Lịch mở đề" value={formatExamWindow(exam.starts_at, exam.ends_at)} />
            <InfoRow label="Số câu hỏi" value={`${exam.question_count} câu`} />
            <InfoRow label="Điểm tối đa" value={`${exam.total_points} điểm`} />
            <InfoRow label="Thời lượng" value={exam.duration_minutes ? `${exam.duration_minutes} phút` : "Không giới hạn"} />
            <InfoRow
              label="Hạn cá nhân"
              value={
                attempt?.status === "started" && runtime?.deadlineAt
                  ? new Intl.DateTimeFormat("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(runtime.deadlineAt))
                  : "Theo lịch chung"
              }
            />
            <InfoRow label="Lượt nộp hiện có" value={`${leaderboard.length} lượt`} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[color:var(--muted)]/60 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}
