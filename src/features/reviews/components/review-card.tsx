import { Brain, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReviewCardProps {
  root: string;
  meaning: string;
  reviewStep: number;
  dueLabel: string;
}

export function ReviewCard({ root, meaning, reviewStep, dueLabel }: ReviewCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-2xl lowercase">{root}</CardTitle>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{meaning}</p>
        </div>
        <Badge variant="success">Ôn tập {reviewStep}/3</Badge>
      </CardHeader>
      <CardContent className="flex items-center gap-3 text-sm text-[color:var(--muted-foreground)]">
        <Brain className="size-4 text-[color:var(--success)]" />
        <span>{dueLabel}</span>
        <CircleAlert className="ml-auto size-4 text-[color:var(--accent)]" />
      </CardContent>
    </Card>
  );
}
