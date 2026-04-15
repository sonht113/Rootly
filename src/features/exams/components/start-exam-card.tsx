"use client";

import { Loader2, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startExamAttemptAction } from "@/features/exams/actions/exams";
import { formatExamWindow } from "@/lib/utils/exams";

interface StartExamCardProps {
  exam: {
    id: string;
    title: string;
    description: string | null;
    question_count: number;
    total_points: number;
    duration_minutes: number | null;
    starts_at: string | null;
    ends_at: string | null;
  };
}

export function StartExamCard({ exam }: StartExamCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sẵn sàng bắt đầu?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
          {exam.description ?? "Đây là kỳ thi chính thức. Hãy kiểm tra kết nối và hoàn thành bài trong một lần làm."}
        </p>

        <div className="grid gap-3 text-sm text-[color:var(--muted-foreground)] md:grid-cols-2">
          <div className="rounded-[14px] bg-[color:var(--muted)]/60 p-4">
            <p className="font-medium text-[color:var(--foreground)]">{exam.question_count} câu hỏi</p>
            <p className="mt-1">{exam.total_points} điểm tối đa</p>
          </div>
          <div className="rounded-[14px] bg-[color:var(--muted)]/60 p-4">
            <p className="font-medium text-[color:var(--foreground)]">
              {exam.duration_minutes ? `${exam.duration_minutes} phút` : "Không giới hạn thời lượng"}
            </p>
            <p className="mt-1">{formatExamWindow(exam.starts_at, exam.ends_at)}</p>
          </div>
        </div>

        <Button
          type="button"
          variant="accent"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              try {
                await startExamAttemptAction({ examId: exam.id });
                toast.success("Kỳ thi đã bắt đầu.");
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Không thể bắt đầu kỳ thi.");
              }
            });
          }}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <PlayCircle />}
          Bắt đầu làm bài
        </Button>
      </CardContent>
    </Card>
  );
}
