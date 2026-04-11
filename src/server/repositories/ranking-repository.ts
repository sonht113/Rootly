import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRankingActivityLabel, getRankingPeriodCopy } from "@/lib/utils/ranking";
import type { RankingActivityPoint, RankingInsightData, RankingMetric, RankingPeriod, RankingRow, RankingScope } from "@/types/domain";

import { unwrapSupabaseError } from "@/server/repositories/shared";

interface GetRankingLeaderboardInput {
  period: RankingPeriod;
  metric: RankingMetric;
  scope: RankingScope;
  classId?: string;
}

export async function getLeaderboard({ period, metric, scope, classId }: GetRankingLeaderboardInput) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_period: period,
    p_metric: metric,
    p_scope: scope,
    p_class_id: classId ?? null,
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải bảng xếp hạng");
  }

  return (data ?? []) as RankingRow[];
}

export async function getRankingInsights({
  leaderboard,
  period,
  metric,
  scope,
  classId,
}: GetRankingLeaderboardInput & {
  leaderboard: RankingRow[];
}): Promise<RankingInsightData> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_ranking_insights", {
    p_period: period,
    p_metric: metric,
    p_scope: scope,
    p_class_id: classId ?? null,
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải insight xếp hạng");
  }

  const insights = normalizeRankingInsights(data);
  const currentUser = leaderboard.find((row) => row.is_current_user) ?? null;

  return {
    ...insights,
    tip: buildRankingTip({
      currentRank: insights.currentUserRank,
      percentile: insights.percentile,
      pointsToNextRank: insights.pointsToNextRank,
      currentStreak: insights.currentStreak,
      period,
      scope,
      metric,
      totalLearners: leaderboard.length,
      hasCurrentUser: currentUser !== null,
    }),
  };
}

function normalizeRankingInsights(value: unknown): RankingInsightData {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  return {
    currentUserRank: parseNullableNumber(raw.currentUserRank),
    currentUserMetricValue: parseNumber(raw.currentUserMetricValue),
    percentile: parseNumber(raw.percentile),
    nextRank: parseNullableNumber(raw.nextRank),
    nextRankMetricValue: parseNullableNumber(raw.nextRankMetricValue),
    pointsToNextRank: parseNumber(raw.pointsToNextRank),
    progressPercent: parseNumber(raw.progressPercent),
    currentStreak: parseNumber(raw.currentStreak),
    activityComparison: normalizeActivityComparison(raw.activityComparison),
    tip: {
      title: "MẸO HỌC TẬP",
      body: "",
    },
  };
}

function normalizeActivityComparison(value: unknown): RankingActivityPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    const rawEntry = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
    const date = typeof rawEntry.date === "string" ? rawEntry.date : "";

    return {
      date,
      label: date ? getRankingActivityLabel(date) : "",
      yourReviews: parseNumber(rawEntry.yourReviews),
      top10AverageReviews: parseFloat(Number(rawEntry.top10AverageReviews ?? 0).toFixed(1)),
    };
  });
}

function buildRankingTip({
  currentRank,
  percentile,
  pointsToNextRank,
  currentStreak,
  period,
  scope,
  metric,
  totalLearners,
  hasCurrentUser,
}: {
  currentRank: number | null;
  percentile: number;
  pointsToNextRank: number;
  currentStreak: number;
  period: RankingPeriod;
  scope: RankingScope;
  metric: RankingMetric;
  totalLearners: number;
  hasCurrentUser: boolean;
}) {
  if (!hasCurrentUser || currentRank === null) {
    return {
      title: "MẸO HỌC TẬP",
      body: "\"Hoàn thành thêm vài buổi học và ôn tập liên tiếp để tên của bạn bắt đầu xuất hiện trên bảng xếp hạng.\"",
    };
  }

  if (currentRank === 1) {
    return {
      title: "MẸO HỌC TẬP",
      body: "\"Bạn đang dẫn đầu. Giữ nhịp ôn tập ngắn nhưng đều mỗi ngày để bảo vệ vị trí số một.\"",
    };
  }

  if (pointsToNextRank > 0 && pointsToNextRank <= 5) {
    return {
      title: "MẸO HỌC TẬP",
      body: `"Bạn chỉ còn ${pointsToNextRank} điểm ở chỉ số ${getMetricTipLabel(metric)} để vượt lên hạng trên. Một phiên học ngắn hôm nay là đủ tạo khác biệt."`,
    };
  }

  if (currentStreak >= 7) {
    return {
      title: "MẸO HỌC TẬP",
      body: "\"Chuỗi học đều đang là lợi thế lớn nhất của bạn. Hãy tiếp tục giữ nhịp này để cải thiện thứ hạng ổn định hơn.\"",
    };
  }

  if (percentile >= 80 || (scope === "class" && totalLearners <= 10)) {
    return {
      title: "MẸO HỌC TẬP",
      body: `"Bạn đang làm tốt trong ${scope === "class" ? "lớp học" : "bảng xếp hạng chung"} ${getRankingPeriodCopy(period)}. Tăng thêm tần suất ôn tập để bứt lên nhóm đầu."`,
    };
  }

  return {
    title: "MẸO HỌC TẬP",
    body: "\"Ôn tập đều đặn luôn hiệu quả hơn những đợt tăng tốc ngắn. Chỉ cần vài phút tập trung mỗi ngày là bạn sẽ leo hạng nhanh hơn.\"",
  };
}

function getMetricTipLabel(metric: RankingMetric) {
  switch (metric) {
    case "root_words_learned":
      return "số từ gốc đã học";
    case "words_learned":
      return "số từ vựng đã học";
    case "reviews_completed":
      return "số lượt ôn tập hoàn thành";
    case "streak":
    default:
      return "chuỗi ngày";
  }
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseNullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}
