import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatExamWindow,
  getExamAvailabilityBadgeVariant,
  getExamAvailabilityLabel,
  getExamAvailabilityState,
  getExamScopeLabel,
  isFinalizedExamAttemptStatus,
} from "@/lib/utils/exams";
import type { ExamAttemptStatus } from "@/types/domain";

interface ExamsListProps {
  exams: Array<{
    id: string;
    title: string;
    description: string | null;
    scope: "class" | "global";
    status: "draft" | "published" | "closed";
    class_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
    question_count: number;
    total_points: number;
    user_attempt: {
      status: ExamAttemptStatus;
      score: number | null;
    } | null;
  }>;
}

export function ExamsList({ exams }: ExamsListProps) {
  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-[color:var(--muted-foreground)]">
          Hien chua co ky thi nao mo cho ban. Khi giao vien hoac quan tri vien phat hanh ky thi moi, ban se thay tai day.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {exams.map((exam) => {
        const availability = getExamAvailabilityState({
          exam,
          attemptStatus: exam.user_attempt?.status ?? null,
        });

        return (
          <Card key={exam.id}>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{exam.title}</CardTitle>
                  <Badge variant={getExamAvailabilityBadgeVariant(availability)}>{getExamAvailabilityLabel(availability)}</Badge>
                </div>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  {getExamScopeLabel(exam.scope)}
                  {exam.class_name ? ` | ${exam.class_name}` : ""}
                </p>
              </div>

              <Button asChild>
                <Link href={`/exams/${exam.id}`}>
                  {isFinalizedExamAttemptStatus(exam.user_attempt?.status) ? "Xem ket qua" : "Xem chi tiet"}
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[color:var(--muted-foreground)]">
                {exam.description ?? "Ky thi dung de danh gia muc do nam vung noi dung da hoc."}
              </p>

              <div className="flex flex-wrap gap-2 text-xs text-[color:var(--muted-foreground)]">
                <span className="rounded-full bg-[color:var(--muted)] px-3 py-1">{exam.question_count} cau hoi</span>
                <span className="rounded-full bg-[color:var(--muted)] px-3 py-1">{exam.total_points} diem toi da</span>
                <span className="rounded-full bg-[color:var(--muted)] px-3 py-1">
                  {formatExamWindow(exam.starts_at, exam.ends_at)}
                </span>
                {typeof exam.user_attempt?.score === "number" ? (
                  <span className="rounded-full bg-[color:var(--primary-soft)] px-3 py-1 text-[color:var(--primary-strong)]">
                    Diem gan nhat: {exam.user_attempt.score}%
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
