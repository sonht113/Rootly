import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RootWordDetail } from "@/types/domain";

interface RootWordDetailSectionsProps {
  rootWord: RootWordDetail;
  summaryAction?: ReactNode;
}

export function RootWordDetailSections({ rootWord, summaryAction }: RootWordDetailSectionsProps) {
  return (
    <>
      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <p className="text-5xl font-semibold lowercase tracking-tight">{rootWord.root}</p>
            <p className="text-lg text-[color:var(--muted-foreground)]">{rootWord.meaning}</p>
            <div className="flex flex-wrap gap-2">
              {rootWord.tags.map((tag) => (
                <Badge key={tag}>
                  <Sparkles className="mr-1 size-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-[18px] bg-[color:var(--muted)] p-4">
            <p className="text-sm font-medium">Tóm tắt học nhanh</p>
            <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted-foreground)]">
              <li>{rootWord.words.length} từ vựng gắn với root này</li>
              <li>Ví dụ câu song ngữ Anh - Việt</li>
              <li>Phù hợp cho phiên học 10-15 phút</li>
            </ul>
            {summaryAction ? <div className="mt-4">{summaryAction}</div> : null}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rootWord.words.map((word) => (
          <Card key={word.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-2xl">{word.word}</CardTitle>
                <Badge variant="outline">{word.part_of_speech}</Badge>
                {word.pronunciation ? (
                  <span className="text-sm text-[color:var(--muted-foreground)]">{word.pronunciation}</span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[16px] bg-[color:var(--muted)] p-4">
                  <p className="text-sm font-medium">Nghĩa tiếng Anh</p>
                  <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{word.meaning_en}</p>
                </div>
                <div className="rounded-[16px] bg-[color:var(--muted)] p-4">
                  <p className="text-sm font-medium">Nghĩa tiếng Việt</p>
                  <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{word.meaning_vi}</p>
                </div>
              </div>
              <div className="grid gap-3">
                {word.example_sentences.map((sentence) => (
                  <div key={sentence.id} className="rounded-[16px] border border-[color:var(--border)] bg-white p-4">
                    <p className="text-sm leading-6 text-[color:var(--foreground)]">{sentence.english_sentence}</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                      {sentence.vietnamese_sentence}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
