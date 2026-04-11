import type { RankingActivityPoint, RankingInsightData, RankingMetric, RankingPeriod, RankingRow, RankingScope, RankingStatusTier } from "@/types/domain";

export interface RankingLeaderboardEntry {
  userId: string;
  rank: number;
  rankLabel: string;
  username: string;
  avatarUrl: string | null;
  statusTier: RankingStatusTier;
  statusLabel: string;
  valueLabel: string;
  isCurrentUser: boolean;
}

export interface RankingPodiumEntry {
  userId: string;
  rank: number;
  username: string;
  avatarUrl: string | null;
  valueLabel: string;
}

export interface RankingPageViewModel {
  metric: RankingMetric;
  metricLabel: string;
  period: RankingPeriod;
  periodLabel: string;
  scope: RankingScope;
  classId?: string;
  podium: RankingPodiumEntry[];
  previewEntries: RankingLeaderboardEntry[];
  allEntries: RankingLeaderboardEntry[];
  listHasOverflow: boolean;
  insights: RankingInsightData;
  activityComparison: RankingActivityPoint[];
  rawRows: RankingRow[];
}
