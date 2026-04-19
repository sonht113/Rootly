import { RootArtifactHero } from "@/features/root-words/components/root-artifact-hero";
import { RootWordDetailSections } from "@/features/root-words/components/root-word-detail-sections";
import { RootWordDetailStreakTracker } from "@/features/root-words/components/root-word-detail-streak-tracker";
import { RootWordQuizActions } from "@/features/root-words/components/root-word-quiz-actions";
import { RootWordReviewActions } from "@/features/root-words/components/root-word-review-actions";
import { getCurrentProfile } from "@/lib/auth/session";
import { getRootWordDetail } from "@/server/repositories/root-words-repository";
import { getRootWordQuizSummary } from "@/server/repositories/root-word-quizzes-repository";
import { getRootLearningSnapshot, getRootWordReviewContext } from "@/server/repositories/study-repository";

export default async function RootArtifactPage({
  params,
  searchParams,
}: {
  params: Promise<{ rootId: string }>;
  searchParams?: Promise<{ reviewId?: string }>;
}) {
  const [{ rootId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { reviewId?: string }),
  ]);
  const reviewId = resolvedSearchParams.reviewId?.trim() ?? "";
  const [rootWord, snapshot, profile, quizSummary, reviewContext] = await Promise.all([
    getRootWordDetail(rootId),
    getRootLearningSnapshot(rootId),
    getCurrentProfile(),
    getRootWordQuizSummary(rootId),
    reviewId ? getRootWordReviewContext(rootId, reviewId) : Promise.resolve(null),
  ]);
  const canManageQuiz = profile?.role === "admin" || profile?.role === "teacher";
  const hasSummaryAction = Boolean(reviewContext) || quizSummary.hasQuiz || canManageQuiz;

  return (
    <div className="space-y-8">
      <RootArtifactHero rootWord={rootWord} nextReviewText={snapshot.nextReviewText} hasPlan={snapshot.hasPlan} />
      <RootWordDetailSections
        rootWord={rootWord}
        completionTracker={<RootWordDetailStreakTracker rootWordId={rootWord.id} />}
        summaryAction={
          hasSummaryAction ? (
            <div className="space-y-3">
              <RootWordQuizActions
                rootWordId={rootWord.id}
                rootWordLabel={rootWord.root}
                hasQuiz={quizSummary.hasQuiz}
                questionCount={quizSummary.questionCount}
                canManageQuiz={canManageQuiz}
              />
              {reviewContext ? <RootWordReviewActions review={reviewContext} /> : null}
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
