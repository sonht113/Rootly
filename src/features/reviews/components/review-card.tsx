import Link from "next/link";
import { ArrowUpRight, Brain } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReviewCardProps {
  href: string;
  root: string;
  meaning: string;
  reviewStep: number;
  dueLabel: string;
}

export function ReviewCard({ href, root, meaning, reviewStep, dueLabel }: ReviewCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl lowercase">{root}</CardTitle>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{meaning}</p>
          </div>
          <Badge variant="warning">Đang ôn tập</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
          <Brain className="size-4 text-[color:var(--accent-foreground)]" />
          <span>Bước {reviewStep}/3</span>
          <span>•</span>
          <span>{dueLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
          Mở chi tiết để xem lại root word này và cập nhật trạng thái ghi nhớ.
        </p>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={href}>
            Xem chi tiết
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
