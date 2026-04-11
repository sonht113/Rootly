import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizRunner } from "@/features/quiz/components/quiz-runner";
import { getRootWordQuizSetDetail } from "@/server/repositories/root-word-quizzes-repository";
import { getRootWordDetail } from "@/server/repositories/root-words-repository";
import { buildQuizQuestions } from "@/server/services/quiz-service";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ rootId: string }>;
}) {
  const { rootId } = await params;
  const [rootWord, quizSet] = await Promise.all([
    getRootWordDetail(rootId),
    getRootWordQuizSetDetail(rootId),
  ]);

  if (!quizSet) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Luyện quiz"
          title={`Quiz cho từ gốc "${rootWord.root}"`}
          description="Từ gốc này hiện chưa có bộ quiz riêng để luyện tập."
        />

        <Card>
          <CardHeader>
            <CardTitle>Chưa có quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
              Hãy quay lại màn chi tiết từ gốc để nhập bộ quiz CSV trước khi bắt đầu luyện tập.
            </p>
            <Button asChild variant="outline">
              <Link href={`/roots/${rootWord.id}`}>Quay lại từ gốc</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = buildQuizQuestions(quizSet);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Luyện quiz"
        title={`Quiz cho từ gốc "${rootWord.root}"`}
        description="Bộ quiz này được nhập riêng cho từ gốc, không còn sinh tự động từ danh sách từ vựng."
        badgeText={`${quizSet.question_count} câu`}
      />
      <QuizRunner rootWordId={rootWord.id} quizSetId={quizSet.id} questions={questions} />
    </div>
  );
}
