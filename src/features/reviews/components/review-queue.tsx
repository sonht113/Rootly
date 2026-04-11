"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { submitReviewAction } from "@/features/study-plans/actions/plans";

interface ReviewQueueProps {
  items: Array<{
    id: string;
    review_step: number;
    root_word: {
      root: string;
      meaning: string;
      words?: Array<{
        id: string;
        word: string;
        meaning_vi: string;
        example_sentences?: Array<{
          english_sentence: string;
          vietnamese_sentence: string;
        }>;
      }>;
    };
  }>;
}

export function ReviewQueue({ items }: ReviewQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / Math.max(items.length, 1)) * 100;

  if (!currentItem) {
    return null;
  }

  function handleDecision(remembered: boolean) {
    startTransition(async () => {
      await submitReviewAction(currentItem.id, remembered);
      toast.success(remembered ? "Đã đánh dấu ghi nhớ" : "Đã lên lịch ôn lại");
      setCurrentIndex((value) => Math.min(value + 1, items.length - 1));
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-[color:var(--muted-foreground)]">
          <span>
            Thẻ {currentIndex + 1}/{items.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl lowercase">{currentItem.root_word.root}</CardTitle>
          <CardDescription>
            Nghĩa gốc: {currentItem.root_word.meaning} · Ôn tập {currentItem.review_step}/3
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3">
            {(currentItem.root_word.words ?? []).map((word) => (
              <div key={word.id} className="rounded-[16px] border border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold">{word.word}</p>
                  <span className="text-sm text-[color:var(--muted-foreground)]">{word.meaning_vi}</span>
                </div>
                {word.example_sentences?.[0] ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-[color:var(--foreground)]">{word.example_sentences[0].english_sentence}</p>
                    <p className="text-[color:var(--muted-foreground)]">{word.example_sentences[0].vietnamese_sentence}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" size="lg" onClick={() => handleDecision(true)} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Mình nhớ rồi
            </Button>
            <Button
              className="flex-1"
              size="lg"
              variant="outline"
              onClick={() => handleDecision(false)}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Cần ôn lại
            </Button>
          </div>

          {currentIndex === items.length - 1 ? (
            <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-white p-4 text-sm text-[color:var(--muted-foreground)]">
              Khi hoàn tất thẻ cuối, bạn có thể quay lại dashboard để xem tiến độ mới nhất.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
