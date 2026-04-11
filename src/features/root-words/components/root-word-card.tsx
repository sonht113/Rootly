import Link from "next/link";
import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface RootWordCardProps {
  id: string;
  root: string;
  meaning: string;
  level: string;
  tags?: string[];
  wordCount: number;
  previewWords?: string[];
  learned?: boolean;
}

export function RootWordCard({
  id,
  root,
  meaning,
  level,
  tags = [],
  wordCount,
  previewWords = [],
  learned = false,
}: RootWordCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[color:var(--primary-strong)]">
              {level}
            </p>
            <CardTitle className="mt-2 text-3xl lowercase">{root}</CardTitle>
          </div>
          <Badge variant={learned ? "success" : "outline"}>{learned ? "Đang học" : "Mới"}</Badge>
        </div>
        <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{meaning}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
          <BookOpen className="size-4" />
          <span>{wordCount} từ vựng liên quan</span>
        </div>
        {previewWords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {previewWords.map((word) => (
              <span
                key={word}
                className="rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs font-medium text-[color:var(--foreground)]"
              >
                {word}
              </span>
            ))}
          </div>
        ) : null}
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                <Sparkles className="mr-1 size-3" />
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href={`/library/${id}`}>
            Xem chi tiết
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

