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
    : "vua xong";
  const isExpired = attempt.status === "expired";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Ket qua cua ban</CardTitle>
              <Badge variant={isExpired ? "warning" : "success"}>{isExpired ? "Het gio tu chot" : "Da nop bai"}</Badge>
            </div>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {isExpired
                ? `He thong tu chot bai khi het thoi gian vao ${submittedLabel}. Chi nhung cau da luu nhap truoc han moi duoc tinh diem.`
                : `Bai thi da duoc nop luc ${submittedLabel}.`}
            </p>
          </div>
          <Badge variant="success">{formatExamScore(attempt.score)}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <ResultMetric label="So cau dung" value={`${attempt.correct_answers ?? 0}/${attempt.total_questions ?? 0}`} />
          <ResultMetric label="Diem dat duoc" value={`${attempt.awarded_points ?? 0}/${attempt.total_points ?? 0}`} />
          <ResultMetric label="Thoi gian lam bai" value={formatExamDuration(durationSeconds)} />
          <ResultMetric label="Xep hang hien tai" value={insights.currentUserRank ? `#${insights.currentUserRank}` : "Chua co"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Bang xep hang ky thi</CardTitle>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {insights.participantCount} luot nop | Diem cao nhat {insights.topScore}% | Diem trung binh {insights.averageScore}%
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href={`/ranking?source=exam&examId=${examId}`}>Xem tren trang xep hang</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboard.length === 0 ? (
            <div className="rounded-[14px] bg-[color:var(--muted)]/60 p-4 text-sm text-[color:var(--muted-foreground)]">
              Chua co nguoi hoc nao khac hoan thanh ky thi nay.
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
                      #{entry.rank} | {entry.is_current_user ? `${displayName} (Ban)` : displayName}
                    </p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      {entry.correct_answers}/{entry.total_questions} cau dung | {formatExamDuration(entry.duration_seconds)}
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
