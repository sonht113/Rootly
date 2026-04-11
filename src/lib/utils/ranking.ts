import type { RankingMetric, RankingPeriod, RankingRow, RankingStatusTier } from "@/types/domain";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const weekdayFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function getStreakCapForPeriod(period: RankingPeriod) {
  switch (period) {
    case "today":
      return 1;
    case "week":
      return 7;
    case "month":
      return 31;
    case "all":
    default:
      return null;
  }
}

export function getRankingMetricLabel(metric: RankingMetric) {
  switch (metric) {
    case "root_words_learned":
      return "Số từ gốc đã học";
    case "words_learned":
      return "Số từ vựng đã học";
    case "reviews_completed":
      return "Lượt ôn tập hoàn thành";
    case "streak":
    default:
      return "Chuỗi ngày";
  }
}

export function getRankingMetricOptionLabel(metric: RankingMetric) {
  switch (metric) {
    case "root_words_learned":
      return "Từ gốc";
    case "words_learned":
      return "Từ vựng";
    case "reviews_completed":
      return "Ôn tập";
    case "streak":
    default:
      return "Chuỗi ngày";
  }
}

export function getRankingPeriodLabel(period: RankingPeriod) {
  switch (period) {
    case "today":
      return "Hôm nay";
    case "week":
      return "Tuần này";
    case "month":
      return "Tháng này";
    case "all":
    default:
      return "Tất cả thời gian";
  }
}

export function getRankingPeriodCopy(period: RankingPeriod) {
  switch (period) {
    case "today":
      return "hôm nay";
    case "week":
      return "tuần này";
    case "month":
      return "tháng này";
    case "all":
    default:
      return "toàn thời gian";
  }
}

export function formatRankingNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatRankingMetricValue(metric: RankingMetric, value: number) {
  if (metric === "streak") {
    return `${formatRankingNumber(value)} ngày`;
  }

  return `${formatRankingNumber(value)} XP`;
}

export function formatRankingDifference(metric: RankingMetric, value: number) {
  if (metric === "streak") {
    return `${formatRankingNumber(value)} ngày`;
  }

  return `${formatRankingNumber(value)} XP`;
}

export function getRankingActivityLabel(date: string) {
  const label = weekdayFormatter.format(new Date(`${date}T00:00:00`));
  return label.slice(0, 1).toUpperCase();
}

export function getRankingPercentile(rank: number, total: number) {
  if (total <= 1) {
    return 100;
  }

  return Math.max(0, Math.min(99, Math.round(((total - rank) / total) * 100)));
}

export function getRankingProgressToNextRank(currentValue: number, nextValue: number | null) {
  if (nextValue === null || nextValue <= currentValue) {
    return {
      pointsToNextRank: 0,
      progressPercent: 100,
    };
  }

  return {
    pointsToNextRank: nextValue - currentValue,
    progressPercent: Math.max(8, Math.min(99, Math.round((currentValue / nextValue) * 100))),
  };
}

export function getRankingStatusTier(
  row: Pick<RankingRow, "root_words_learned" | "words_learned" | "reviews_completed" | "streak">,
): RankingStatusTier {
  if (
    row.streak >= 21 ||
    row.root_words_learned >= 20 ||
    row.words_learned >= 180 ||
    row.reviews_completed >= 240
  ) {
    return "polyglot";
  }

  if (
    row.streak >= 7 ||
    row.root_words_learned >= 8 ||
    row.words_learned >= 75 ||
    row.reviews_completed >= 80
  ) {
    return "curator";
  }

  return "novice";
}

export function getRankingStatusLabel(tier: RankingStatusTier) {
  switch (tier) {
    case "polyglot":
      return "Bậc thầy ngôn ngữ";
    case "curator":
      return "Người dẫn nhịp";
    case "novice":
    default:
      return "Người mới";
  }
}
