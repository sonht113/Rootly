import { formatRankingNumber } from "@/lib/utils/ranking";
import { buildExamRankingInsights, formatExamDuration, getExamRankingStatusTier } from "@/lib/utils/exams";
import { getProfileDisplayName } from "@/lib/utils/profile";
import type { RankingLeaderboardEntry, RankingPodiumEntry } from "@/features/ranking/types";
import type { ExamLeaderboardRow, ExamRankingInsightData } from "@/types/domain";

export interface ExamRankingViewModel {
  podium: RankingPodiumEntry[];
  previewEntries: RankingLeaderboardEntry[];
  allEntries: RankingLeaderboardEntry[];
  listHasOverflow: boolean;
  insights: ExamRankingInsightData;
}

export function buildExamRankingViewModel(leaderboard: ExamLeaderboardRow[]): ExamRankingViewModel {
  const podium = leaderboard.slice(0, 3).map<RankingPodiumEntry>((row) => ({
    userId: row.user_id,
    rank: row.rank,
    displayName: getProfileDisplayName(row.full_name, row.username),
    username: row.username,
    avatarUrl: row.avatar_url,
    valueLabel: `${row.score}%`,
  }));

  const allEntries = leaderboard.slice(3).map<RankingLeaderboardEntry>((row) => ({
    userId: row.user_id,
    rank: row.rank,
    rankLabel: formatRankingNumber(row.rank).padStart(2, "0"),
    displayName: getProfileDisplayName(row.full_name, row.username),
    username: row.username,
    avatarUrl: row.avatar_url,
    statusTier: getExamRankingStatusTier(row.score),
    statusLabel: `${row.correct_answers}/${row.total_questions} đúng · ${formatExamDuration(row.duration_seconds)}`,
    valueLabel: `${row.score}%`,
    isCurrentUser: row.is_current_user,
  }));

  return {
    podium,
    previewEntries: getPreviewEntries(allEntries),
    allEntries,
    listHasOverflow: allEntries.length > 4,
    insights: buildExamRankingInsights(leaderboard),
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
