"use client";

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptClassSuggestionAction } from "@/features/classes/actions/classes";
import type { CurrentUserClassSuggestion } from "@/server/repositories/classes-repository";

interface ClassSuggestionsPanelProps {
  suggestions: CurrentUserClassSuggestion[];
  title?: string;
  description?: string;
  emptyMessage?: string | null;
  showClassName?: boolean;
}

function formatSuggestedDate(dateKey: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function getStatusLabel(status: CurrentUserClassSuggestion["status"]) {
  if (status === "accepted") {
    return "Đã nhận";
  }

  if (status === "scheduled") {
    return "Đã có lịch";
  }

  return "Mới";
}

export function ClassSuggestionsPanel({
  suggestions,
  title = "Gợi ý từ lớp",
  description = "Giáo viên có thể gợi ý root word, nhưng bạn vẫn chủ động đưa nó vào lịch cá nhân khi thấy phù hợp.",
  emptyMessage = null,
  showClassName = true,
}: ClassSuggestionsPanelProps) {
  const router = useRouter();
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (suggestions.length === 0) {
    if (!emptyMessage) {
      return null;
    }

    return (
      <Card className="border border-[color:var(--border)] bg-white shadow-[var(--shadow-soft)]">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#e9f1ff] text-[#0058be]">
              <Sparkles className="size-4" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-[18px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[color:var(--border)] bg-white shadow-[var(--shadow-soft)]">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#e9f1ff] text-[#0058be]">
            <Sparkles className="size-4" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => {
          const isRowPending = isPending && pendingSuggestionId === suggestion.id;

          return (
            <div
              key={suggestion.id}
              className="flex flex-col gap-4 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-[family:var(--font-display)] text-xl font-bold lowercase text-[#191c1e]">
                    {suggestion.rootWord.root}
                  </p>
                  <Badge variant={suggestion.status === "pending" ? "success" : "outline"}>
                    {getStatusLabel(suggestion.status)}
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                  {suggestion.rootWord.meaning}
                  {showClassName ? (
                    <>
                      {" "}
                      · Lớp <strong>{suggestion.className}</strong>
                    </>
                  ) : null}{" "}
                  · Gợi ý cho{" "}
                  {formatSuggestedDate(suggestion.suggestedDate)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button asChild variant="outline" className="min-w-[9rem]">
                  <Link href={`/roots/${suggestion.rootWord.id}`}>Xem hồ sơ</Link>
                </Button>

                {suggestion.status === "pending" ? (
                  <Button
                    type="button"
                    variant="accent"
                    className="min-w-[9rem]"
                    disabled={isRowPending}
                    onClick={() => {
                      setPendingSuggestionId(suggestion.id);
                      startTransition(async () => {
                        try {
                          const result = await acceptClassSuggestionAction({
                            suggestionId: suggestion.id,
                          });
                          toast.success(
                            result.status === "scheduled"
                              ? `${result.rootWordLabel} đã có trong lịch ngày ${result.suggestedDate}.`
                              : `Đã thêm ${result.rootWordLabel} vào lịch ngày ${result.suggestedDate}.`,
                          );
                          router.refresh();
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Không thể nhận gợi ý từ lớp.");
                        } finally {
                          setPendingSuggestionId(null);
                        }
                      });
                    }}
                  >
                    {isRowPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Thêm vào lịch
                  </Button>
                ) : (
                  <Button asChild variant="secondary" className="min-w-[9rem]">
                    <Link href="/calendar">Mở lịch học</Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
