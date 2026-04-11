import { RootArtifactHero } from "@/features/root-words/components/root-artifact-hero";
import { RootWordDetailSections } from "@/features/root-words/components/root-word-detail-sections";
import { RootWordQuizActions } from "@/features/root-words/components/root-word-quiz-actions";
import { getCurrentProfile } from "@/lib/auth/session";
import { getRootWordDetail } from "@/server/repositories/root-words-repository";
import { getRootWordQuizSummary } from "@/server/repositories/root-word-quizzes-repository";
import { getRootLearningSnapshot } from "@/server/repositories/study-repository";

export default async function RootArtifactPage({
  params,
}: {
  params: Promise<{ rootId: string }>;
}) {
  const { rootId } = await params;
  const [rootWord, snapshot, profile, quizSummary] = await Promise.all([
    getRootWordDetail(rootId),
    getRootLearningSnapshot(rootId),
    getCurrentProfile(),
    getRootWordQuizSummary(rootId),
  ]);

  const canManageQuiz = profile?.role === "admin" || profile?.role === "teacher";

  return (
    <div className="space-y-8">
      <RootArtifactHero rootWord={rootWord} nextReviewText={snapshot.nextReviewText} />
      <RootWordDetailSections
        rootWord={rootWord}
        summaryAction={
          <RootWordQuizActions
            rootWordId={rootWord.id}
            rootWordLabel={rootWord.root}
            hasQuiz={quizSummary.hasQuiz}
            questionCount={quizSummary.questionCount}
            canManageQuiz={canManageQuiz}
          />
        }
      />
    </div>
  );
}
