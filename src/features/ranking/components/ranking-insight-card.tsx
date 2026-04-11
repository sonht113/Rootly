import { Flame, Trophy } from "lucide-react";

import { formatRankingDifference, getRankingPeriodCopy } from "@/lib/utils/ranking";
import type { RankingInsightData, RankingMetric, RankingPeriod, RankingScope } from "@/types/domain";

interface RankingInsightCardProps {
  insights: RankingInsightData;
  metric: RankingMetric;
  period: RankingPeriod;
  scope: RankingScope;
}

export function RankingInsightCard({ insights, metric, period, scope }: RankingInsightCardProps) {
  const isLeading = insights.currentUserRank === 1;
  const title = insights.currentUserRank ? `Hạng #${insights.currentUserRank}` : "Chưa xếp hạng";
  const description = !insights.currentUserRank
    ? "Hoàn thành thêm vài phiên học để xuất hiện trên bảng xếp hạng."
    : isLeading
      ? `Bạn đang dẫn đầu bảng xếp hạng ${scope === "class" ? "trong lớp" : "toàn hệ thống"} ${getRankingPeriodCopy(period)}.`
      : `Bạn đang vượt ${insights.percentile}% ${scope === "class" ? "bạn cùng lớp" : "người học"} ${getRankingPeriodCopy(period)}.`;
  const progressLabel = isLeading ? "VỊ TRÍ DẪN ĐẦU" : "MỤC TIÊU KẾ TIẾP";
  const remainingLabel = isLeading ? "BẠN ĐANG DẪN ĐẦU" : `CÒN ${formatRankingDifference(metric, insights.pointsToNextRank)}`;

  return (
    <section className="rounded-[32px] bg-white px-8 py-8 shadow-[var(--shadow-soft)]">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#d8e2ff] text-[#0058be]">
        <Trophy className="size-6" />
      </div>

      <div className="mt-6 text-center">
        <h2 className="[font-family:var(--font-display)] text-4xl font-extrabold text-[#191c1e]">{title}</h2>
        <p className="mx-auto mt-3 max-w-[220px] text-sm leading-6 text-[#424754]">{description}</p>
      </div>

      <div className="mt-6">
        <div className="h-3 rounded-full bg-[#f2f4f6]">
          <div
            className="h-full rounded-full bg-[#994100] transition-all"
            style={{ width: `${insights.progressPercent}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold tracking-[0.12em]">
          <span className="text-[#424754]">{progressLabel}</span>
          <span className="text-[#994100]">{remainingLabel}</span>
        </div>
      </div>

      <div className="mt-8 rounded-[16px] bg-[#f2f4f6] p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#ffdbca] text-[#994100]">
            <Flame className="size-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-[#424754]">CHUỖI NGÀY HIỆN TẠI</p>
            <p className="[font-family:var(--font-display)] text-[28px] font-extrabold text-[#191c1e]">
              {insights.currentStreak} ngày
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
