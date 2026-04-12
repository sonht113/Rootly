import { RefreshOnMount } from "@/components/shared/refresh-on-mount";
import { PageHeader } from "@/components/shared/page-header";
import { RootWordDetailSections } from "@/features/root-words/components/root-word-detail-sections";
import { RootWordQuizActions } from "@/features/root-words/components/root-word-quiz-actions";
import { RootWordReviewActions } from "@/features/root-words/components/root-word-review-actions";
import { SchedulePlanDialog } from "@/features/study-plans/components/schedule-plan-dialog";
import { getCurrentProfile } from "@/lib/auth/session";
import { getRootWordDetail } from "@/server/repositories/root-words-repository";
import { getRootWordQuizSummary } from "@/server/repositories/root-word-quizzes-repository";
import { getRootWordReviewContext, recordRootWordDetailView } from "@/server/repositories/study-repository";

export default async function RootWordDetailPage({
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
  const [rootWord, profile, quizSummary, reviewContext] = await Promise.all([
    getRootWordDetail(rootId),
    getCurrentProfile(),
    getRootWordQuizSummary(rootId),
    reviewId ? getRootWordReviewContext(rootId, reviewId) : Promise.resolve(null),
  ]);
  const detailViewResult =
    profile?.role === "student" ? await recordRootWordDetailView(rootId) : { recorded: false, sessionId: null };

  const canManageQuiz = profile?.role === "admin" || profile?.role === "teacher";
  const hasSummaryAction = Boolean(reviewContext) || quizSummary.hasQuiz || canManageQuiz;

  return (
    <div className="space-y-6">
      <RefreshOnMount enabled={detailViewResult.recorded} />
      <PageHeader
        eyebrow="Chi tiết từ gốc"
        title={rootWord.root}
        description={rootWord.description}
        badgeText={rootWord.level}
        action={
          <SchedulePlanDialog
            rootWords={[
              {
                id: rootWord.id,
                root: rootWord.root,
                meaning: rootWord.meaning,
              },
            ]}
            triggerLabel="Thêm vào lịch học"
            triggerVariant="accent"
          />
        }
      />

      <RootWordDetailSections
        rootWord={rootWord}
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
