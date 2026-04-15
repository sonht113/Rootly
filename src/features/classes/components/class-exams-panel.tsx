import Link from "next/link";
import { ArrowRight, PlusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatExamWindow,
  getExamAvailabilityBadgeVariant,
  getExamAvailabilityLabel,
  getExamAvailabilityState,
  getExamStatusLabel,
  isFinalizedExamAttemptStatus,
} from "@/lib/utils/exams";
import type { ExamAttemptStatus, ExamScope, ExamStatus } from "@/types/domain";

export interface ClassExamPanelItem {
  id: string;
  title: string;
  description: string | null;
  scope: ExamScope;
  status: ExamStatus;
  class_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  question_count: number;
  total_points: number;
  user_attempt?: {
    status: ExamAttemptStatus;
    score: number | null;
  } | null;
}

interface ClassExamsPanelProps {
  title: string;
  description: string;
  emptyMessage: string;
  audience: "student" | "teacher";
  exams: ClassExamPanelItem[];
  hrefBuilder: (examId: string) => string;
  actionHref?: string;
  actionLabel?: string;
}

export function ClassExamsPanel({
  title,
  description,
  emptyMessage,
  audience,
  exams,
  hrefBuilder,
  actionHref,
  actionLabel,
}: ClassExamsPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <CardTitle>{title}</CardTitle>
          <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Button asChild variant="outline" size="sm">
            <Link href={actionHref}>
              <PlusCircle className="size-4" />
              {actionLabel}
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {exams.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
            {emptyMessage}
          </div>
        ) : (
          exams.map((exam) => {
            const availability =
              audience === "student"
                ? getExamAvailabilityState({
                    exam,
                    attemptStatus: exam.user_attempt?.status ?? null,
                  })
                : null;

            return (
              <Link
                key={exam.id}
                href={hrefBuilder(exam.id)}
                className="flex items-start justify-between gap-4 rounded-[16px] border border-[color:var(--border)] p-4 transition hover:border-[color:var(--primary)]/40 hover:bg-[color:var(--muted)]/30"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[color:var(--foreground)]">{exam.title}</p>
                    {audience === "student" && availability ? (
                      <Badge variant={getExamAvailabilityBadgeVariant(availability)}>{getExamAvailabilityLabel(availability)}</Badge>
                    ) : (
                      <Badge variant={exam.status === "draft" ? "outline" : exam.status === "closed" ? "danger" : "success"}>
                        {getExamStatusLabel(exam.status)}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    {exam.question_count} câu · {exam.total_points} điểm · {formatExamWindow(exam.starts_at, exam.ends_at)}
                  </p>

                  {exam.description ? <p className="text-sm text-[color:var(--muted-foreground)]">{exam.description}</p> : null}

                  {typeof exam.user_attempt?.score === "number" ? (
                    <p className="text-sm font-medium text-[color:var(--primary-strong)]">Điểm gần nhất: {exam.user_attempt.score}%</p>
                  ) : null}
                </div>

                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--primary-strong)]">
                  {audience === "student" && isFinalizedExamAttemptStatus(exam.user_attempt?.status)
                    ? "Xem kết quả"
                    : "Mở chi tiết"}
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
