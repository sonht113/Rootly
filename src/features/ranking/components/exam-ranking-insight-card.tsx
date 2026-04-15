import { Target, Trophy } from "lucide-react";

import type { ExamRankingInsightData } from "@/types/domain";

export function ExamRankingInsightCard({ insights }: { insights: ExamRankingInsightData }) {
  const isLeading = insights.currentUserRank === 1;
  const title = insights.currentUserRank ? `Hạng #${insights.currentUserRank}` : "Chưa xếp hạng";
  const remainingLabel = isLeading ? "BẠN ĐANG DẪN ĐẦU" : `CÒN ${insights.pointsToNextRank}% ĐỂ TĂNG HẠNG`;

  return (
    <section className="rounded-[32px] bg-white px-8 py-8 shadow-[var(--shadow-soft)]">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#d8e2ff] text-[#0058be]">
        <Trophy className="size-6" />
      </div>

      <div className="mt-6 text-center">
        <h2 className="[font-family:var(--font-display)] text-4xl font-extrabold text-[#191c1e]">{title}</h2>
        <p className="mx-auto mt-3 max-w-[240px] text-sm leading-6 text-[#424754]">
          {insights.currentUserScore === null
            ? "Nộp bài để xuất hiện trên bảng xếp hạng kỳ thi."
            : `Điểm hiện tại của bạn là ${insights.currentUserScore}%. Bạn đang vượt ${insights.percentile}% người tham gia.`}
        </p>
      </div>

      <div className="mt-6">
        <div className="h-3 rounded-full bg-[#f2f4f6]">
          <div
            className="h-full rounded-full bg-[#994100] transition-all"
            style={{ width: `${insights.progressPercent}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold tracking-[0.12em]">
          <span className="text-[#424754]">MỤC TIÊU KẾ TIẾP</span>
          <span className="text-[#994100]">{remainingLabel}</span>
        </div>
      </div>

      <div className="mt-8 rounded-[16px] bg-[#f2f4f6] p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#ffdbca] text-[#994100]">
            <Target className="size-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-[#424754]">ĐỘ CHÍNH XÁC HIỆN TẠI</p>
            <p className="[font-family:var(--font-display)] text-[28px] font-extrabold text-[#191c1e]">
              {insights.currentUserCorrectAnswers !== null && insights.currentUserTotalQuestions !== null
                ? `${insights.currentUserCorrectAnswers}/${insights.currentUserTotalQuestions}`
                : "--"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
