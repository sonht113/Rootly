"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RootLearningStatusBadge } from "@/features/root-words/components/root-learning-status-badge";
import { submitReviewAction } from "@/features/study-plans/actions/plans";
import type { RootWordReviewContext } from "@/server/repositories/study-repository";

interface RootWordReviewActionsProps {
  review: RootWordReviewContext;
}

export function RootWordReviewActions({ review }: RootWordReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isRemembered = review.status === "done";

  function handleDecision(remembered: boolean) {
    startTransition(async () => {
      try {
        await submitReviewAction(review.id, remembered);
        toast.success(remembered ? "Đã đánh dấu root word này là đã nhớ." : "Đã giữ root word này trong danh sách ôn tập.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái ôn tập.");
      }
    });
  }

  return (
    <Card className="border-[color:var(--border)] bg-white">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Ôn tập root word này</CardTitle>
            <CardDescription className="mt-1">
              Bước {review.reviewStep}/3 · {review.dueLabel}
            </CardDescription>
          </div>
          <RootLearningStatusBadge status={isRemembered ? "remembered" : "reviewing"} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
          {isRemembered
            ? "Lượt ôn tập hiện tại đã được đánh dấu là đã nhớ. Bạn có thể quay lại reviews hoặc tiếp tục xem lại các từ liên quan."
            : review.status === "rescheduled"
              ? "Lượt ôn tập này đã được dời lịch. Bạn vẫn có thể xem lại ngay bây giờ, hoặc quay lại sau theo nhịp ôn mới."
              : "Sau khi xem lại nghĩa và các từ liên quan, hãy chọn trạng thái phù hợp để cập nhật tiến trình ôn tập."}
        </p>

        {isRemembered ? null : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" size="lg" onClick={() => handleDecision(true)} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Đã nhớ
            </Button>
            <Button className="flex-1" size="lg" variant="outline" onClick={() => handleDecision(false)} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Ôn tập tiếp
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
