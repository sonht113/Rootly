import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildExamRankingInsights,
  formatExamDuration,
  formatExamScore,
  getExamAttemptDurationFromRow,
} from "@/lib/utils/exams";
import { getProfileDisplayName } from "@/lib/utils/profile";
import type { ExamAttemptRow, ExamLeaderboardRow } from "@/types/domain";

interface ExamResultSummaryProps {
  examId: string;
  attempt: ExamAttemptRow;
  leaderboard: ExamLeaderboardRow[];
}

export function ExamResultSummary({ examId, attempt, leaderboard }: ExamResultSummaryProps) {
  const insights = buildExamRankingInsights(leaderboard);
  const durationSeconds = getExamAttemptDurationFromRow(attempt);
  const submittedLabel = attempt.submitted_at
    ? new Intl.DateTimeFormat("vi-VN").format(new Date(attempt.submitted_at))
    : "vừa xong";
  const isExpired = attempt.status === "expired";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Kết quả của bạn</CardTitle>
              <Badge variant={isExpired ? "warning" : "success"}>{isExpired ? "Hết giờ tự chốt" : "Đã nộp bài"}</Badge>
            </div>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {isExpired
                ? `Hệ thống tự chốt bài khi hết thời gian vào ${submittedLabel}. Chỉ những câu đã lưu nháp trước hạn mới được tính điểm.`
                : `Bài thi đã được nộp lúc ${submittedLabel}.`}
            </p>
          </div>
          <Badge variant="success">{formatExamScore(attempt.score)}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <ResultMetric label="Số câu đúng" value={`${attempt.correct_answers ?? 0}/${attempt.total_questions ?? 0}`} />
          <ResultMetric label="Điểm đạt được" value={`${attempt.awarded_points ?? 0}/${attempt.total_points ?? 0}`} />
          <ResultMetric label="Thời gian làm bài" value={formatExamDuration(durationSeconds)} />
          <ResultMetric label="Xếp hạng hiện tại" value={insights.currentUserRank ? `#${insights.currentUserRank}` : "Chưa có"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Bảng xếp hạng kỳ thi</CardTitle>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {insights.participantCount} lượt nộp | Điểm cao nhất {insights.topScore}% | Điểm trung bình {insights.averageScore}%
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href={`/ranking?source=exam&examId=${examId}`}>Xem trên trang xếp hạng</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboard.length === 0 ? (
            <div className="rounded-[14px] bg-[color:var(--muted)]/60 p-4 text-sm text-[color:var(--muted-foreground)]">
              Chưa có người học nào khác hoàn thành kỳ thi này.
            </div>
          ) : (
            leaderboard.slice(0, 5).map((entry) => {
              const displayName = getProfileDisplayName(entry.full_name, entry.username);

              return (
                <div
                  key={entry.user_id}
                  className="flex items-center justify-between rounded-[14px] border border-[color:var(--border)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      #{entry.rank} | {entry.is_current_user ? `${displayName} (Bạn)` : displayName}
                    </p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      {entry.correct_answers}/{entry.total_questions} câu đúng | {formatExamDuration(entry.duration_seconds)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[color:var(--primary-strong)]">{entry.score}%</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[color:var(--muted)]/60 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}
