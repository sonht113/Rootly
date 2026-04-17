import { buildTodayDashboardViewModel } from "@/features/today-dashboard/lib/build-today-dashboard-view-model";
import { getTodayDailyRootRecommendation } from "@/server/repositories/daily-root-recommendations-repository";
import { getLeaderboard } from "@/server/repositories/ranking-repository";
import { getRootWordDetail } from "@/server/repositories/root-words-repository";
import { getDailyGoalSummary, getReviewQueue, getTodayDashboard } from "@/server/repositories/study-repository";

export async function getStudentTodayDashboardViewModel() {
  const [dashboard, dailyGoal, leaderboard, reviewQueue, todayRecommendation] = await Promise.all([
    getTodayDashboard(),
    getDailyGoalSummary(),
    getLeaderboard({
      period: "week",
      metric: "root_words_learned",
      scope: "all",
    }),
    getReviewQueue(),
    getTodayDailyRootRecommendation(),
  ]);

  const featuredRootId =
    todayRecommendation?.rootWordId ??
    dashboard.todayPlans[0]?.root_word.id ??
    dashboard.overduePlans[0]?.root_word.id ??
    null;
  const featuredRootSource = todayRecommendation
    ? "admin-recommended"
    : dashboard.todayPlans[0]
    ? "today"
    : dashboard.overduePlans[0]
      ? "overdue"
      : "empty";
  const featuredRootDetail = featuredRootId ? await getRootWordDetail(featuredRootId) : null;

  return buildTodayDashboardViewModel({
    dashboard,
    dailyGoal,
    leaderboard,
    reviewQueue: reviewQueue.map((review) => ({
      id: review.id,
      review_date: review.review_date,
      review_step: review.review_step,
      status: review.status,
      root_word: {
        root: review.root_word.root,
      },
    })),
    featuredRootDetail,
    featuredRootSource,
  });
}
