import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { RankingActivityComparisonChart } from "@/features/ranking/components/ranking-activity-comparison-chart";
import { RankingFilters } from "@/features/ranking/components/ranking-filters";
import { RankingInsightCard } from "@/features/ranking/components/ranking-insight-card";
import { RankingList } from "@/features/ranking/components/ranking-list";
import { RankingPodium } from "@/features/ranking/components/ranking-podium";
import { RankingTipCard } from "@/features/ranking/components/ranking-tip-card";
import { buildRankingPageViewModel } from "@/features/ranking/lib/build-ranking-page-view-model";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLeaderboard, getRankingInsights } from "@/server/repositories/ranking-repository";
import type { RankingMetric, RankingPeriod, RankingScope } from "@/types/domain";

const metricOptions: RankingMetric[] = ["root_words_learned", "words_learned", "reviews_completed", "streak"];
const periodOptions: RankingPeriod[] = ["today", "week", "month", "all"];

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: RankingMetric; period?: RankingPeriod; scope?: RankingScope; classId?: string }>;
}) {
  const params = await searchParams;
  const metric = metricOptions.includes(params.metric ?? "reviews_completed") ? (params.metric as RankingMetric) : "reviews_completed";
  const period = periodOptions.includes(params.period ?? "week") ? (params.period as RankingPeriod) : "week";
  const requestedScope = params.scope === "class" ? "class" : "all";
  const supabase = await createServerSupabaseClient();
  const { data: classRows } = await supabase.from("classes").select("id, name").order("name");
  const classes = classRows ?? [];
  const scope = requestedScope === "class" && classes.length > 0 ? "class" : "all";
  const classId = scope === "class" ? resolveClassId(params.classId, classes) : undefined;

  const leaderboard = await getLeaderboard({
    metric,
    period,
    scope,
    classId,
  });

  const insights = await getRankingInsights({
    leaderboard,
    metric,
    period,
    scope,
    classId,
  });

  const viewModel = buildRankingPageViewModel({
    leaderboard,
    insights,
    metric,
    period,
    scope,
    classId,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Xếp hạng"
        title="Bảng xếp hạng học tập"
        description="Theo dõi vị trí của bạn, so sánh nhịp học với nhóm dẫn đầu và giữ đà bứt lên qua từng giai đoạn."
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-8">
          <RankingFilters metric={metric} period={period} scope={scope} classId={classId} classes={classes} />
          <RankingPodium entries={viewModel.podium} />
          <RankingList
            previewEntries={viewModel.previewEntries}
            allEntries={viewModel.allEntries}
            listHasOverflow={viewModel.listHasOverflow}
          />
        </div>

        <div className="space-y-8">
          <RankingInsightCard insights={viewModel.insights} metric={metric} period={period} scope={scope} />

          <section className="rounded-[32px] bg-white px-8 py-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-4">
              <h2 className="[font-family:var(--font-display)] text-[28px] font-bold leading-[1.05] text-[#191c1e]">
                So sánh
                <br />
                hoạt động
              </h2>
              <BarChart3 className="mt-1 size-5 text-[#727785]" />
            </div>

            <div className="mt-6">
              <RankingActivityComparisonChart data={viewModel.activityComparison} />
            </div>

            <div className="mt-6 space-y-3 text-[11px] text-[#424754]">
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-[2px] bg-[#0058be]" />
                <span>Lượt ôn tập của bạn</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-[2px] bg-[#e0e3e5]" />
                <span>Trung bình top 10</span>
              </div>
            </div>
          </section>

          <RankingTipCard title={viewModel.insights.tip.title} body={viewModel.insights.tip.body} />
        </div>
      </div>
    </div>
  );
}

function resolveClassId(classId: string | undefined, classes: Array<{ id: string; name: string }>) {
  if (classId && classes.some((classItem) => classItem.id === classId)) {
    return classId;
  }

  return classes[0]?.id;
}
