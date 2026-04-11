import { PageHeader } from "@/components/shared/page-header";
import { RootWordDetailSections } from "@/features/root-words/components/root-word-detail-sections";
import { RootWordQuizActions } from "@/features/root-words/components/root-word-quiz-actions";
import { SchedulePlanDialog } from "@/features/study-plans/components/schedule-plan-dialog";
import { getCurrentProfile } from "@/lib/auth/session";
import { getRootWordDetail } from "@/server/repositories/root-words-repository";
import { getRootWordQuizSummary } from "@/server/repositories/root-word-quizzes-repository";

export default async function RootWordDetailPage({
  params,
}: {
  params: Promise<{ rootId: string }>;
}) {
  const { rootId } = await params;
  const [rootWord, profile, quizSummary] = await Promise.all([
    getRootWordDetail(rootId),
    getCurrentProfile(),
    getRootWordQuizSummary(rootId),
  ]);

  const canManageQuiz = profile?.role === "admin" || profile?.role === "teacher";

  return (
    <div className="space-y-6">
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
