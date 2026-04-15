import { FileCheck2 } from "lucide-react";

import { formatExamWindow, getExamScopeLabel } from "@/lib/utils/exams";

interface ExamRankingSummaryCardProps {
  exam: {
    title: string;
    scope: "class" | "global";
    class_name: string | null;
    question_count: number;
    total_points: number;
    starts_at: string | null;
    ends_at: string | null;
  };
  participantCount: number;
  topScore: number;
  averageScore: number;
}

export function ExamRankingSummaryCard({
  exam,
  participantCount,
  topScore,
  averageScore,
}: ExamRankingSummaryCardProps) {
  return (
    <section className="rounded-[32px] bg-white px-8 py-8 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="[font-family:var(--font-display)] text-[28px] font-bold leading-[1.05] text-[#191c1e]">
            Xếp hạng
            <br />
            kỳ thi
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#424754]">{exam.title}</p>
        </div>
        <FileCheck2 className="mt-1 size-5 text-[#727785]" />
      </div>

      <div className="mt-6 space-y-3 text-sm text-[#424754]">
        <SummaryRow label="Phạm vi" value={`${getExamScopeLabel(exam.scope)}${exam.class_name ? ` · ${exam.class_name}` : ""}`} />
        <SummaryRow label="Lịch mở đề" value={formatExamWindow(exam.starts_at, exam.ends_at)} />
        <SummaryRow label="Cấu trúc" value={`${exam.question_count} câu · ${exam.total_points} điểm`} />
        <SummaryRow label="Tham gia" value={`${participantCount} lượt nộp`} />
        <SummaryRow label="Điểm cao nhất" value={`${topScore}%`} />
        <SummaryRow label="Điểm trung bình" value={`${averageScore}%`} />
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[14px] bg-[#f2f4f6] px-4 py-3">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#727785]">{label}</span>
      <span className="text-right text-sm font-medium text-[#191c1e]">{value}</span>
    </div>
  );
}
