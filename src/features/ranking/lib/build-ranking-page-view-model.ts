import {
  formatRankingMetricValue,
  formatRankingNumber,
  getRankingMetricLabel,
  getRankingPeriodLabel,
  getRankingStatusLabel,
  getRankingStatusTier,
} from "@/lib/utils/ranking";
import { getProfileDisplayName } from "@/lib/utils/profile";
import type { RankingPageViewModel, RankingLeaderboardEntry } from "@/features/ranking/types";
import type { RankingInsightData, RankingMetric, RankingPeriod, RankingRow, RankingScope } from "@/types/domain";

interface BuildRankingPageViewModelInput {
  leaderboard: RankingRow[];
  insights: RankingInsightData;
  metric: RankingMetric;
  period: RankingPeriod;
  scope: RankingScope;
  classId?: string;
}

export function buildRankingPageViewModel({
  leaderboard,
  insights,
  metric,
  period,
  scope,
  classId,
}: BuildRankingPageViewModelInput): RankingPageViewModel {
  const podium = leaderboard.slice(0, 3).map((row) => ({
    userId: row.user_id,
    rank: row.rank,
    displayName: getProfileDisplayName(row.full_name, row.username),
    username: row.username,
    avatarUrl: row.avatar_url,
    valueLabel: formatRankingMetricValue(metric, row.metric_value),
  }));

  const allEntries = leaderboard.slice(3).map<RankingLeaderboardEntry>((row) => {
    const statusTier = getRankingStatusTier(row);

    return {
      userId: row.user_id,
      rank: row.rank,
      rankLabel: formatRankingNumber(row.rank).padStart(2, "0"),
      displayName: getProfileDisplayName(row.full_name, row.username),
      username: row.username,
      avatarUrl: row.avatar_url,
      statusTier,
      statusLabel: getRankingStatusLabel(statusTier),
      valueLabel: formatRankingMetricValue(metric, row.metric_value),
      isCurrentUser: row.is_current_user,
    };
  });

  return {
    metric,
    metricLabel: getRankingMetricLabel(metric),
    period,
    periodLabel: getRankingPeriodLabel(period),
    scope,
    classId,
    podium,
    previewEntries: getPreviewEntries(allEntries),
    allEntries,
    listHasOverflow: allEntries.length > 4,
    insights,
    activityComparison: insights.activityComparison,
    rawRows: leaderboard,
  };
}

function getPreviewEntries(entries: RankingLeaderboardEntry[]) {
  if (entries.length <= 4) {
    return entries;
  }

  const preview = entries.slice(0, 4);
  const currentUserEntry = entries.find((entry) => entry.isCurrentUser);

  if (!currentUserEntry || preview.some((entry) => entry.userId === currentUserEntry.userId)) {
    return preview;
  }

  const prioritized = [...entries.slice(0, 3), currentUserEntry]
    .filter((entry, index, allEntries) => allEntries.findIndex((candidate) => candidate.userId === entry.userId) === index)
    .sort((left, right) => left.rank - right.rank);

  return prioritized;
}
