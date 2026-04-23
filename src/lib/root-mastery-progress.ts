export interface RootMasteryProgressSignals {
  hasCompletedDetailView: boolean;
  hasCompletedQuiz: boolean;
  completedReviewSteps: number;
  isRemembered: boolean;
}

export function calculateRootMasteryProgress({
  hasCompletedDetailView,
  hasCompletedQuiz,
  completedReviewSteps,
  isRemembered,
}: RootMasteryProgressSignals) {
  if (isRemembered) {
    return 100;
  }

  const normalizedCompletedReviewSteps = Math.max(0, Math.min(3, Math.floor(completedReviewSteps)));
  const progress =
    (hasCompletedDetailView ? 10 : 0) +
    (hasCompletedQuiz ? 40 : 0) +
    normalizedCompletedReviewSteps * 10;

  return Math.max(0, Math.min(100, progress));
}
