import { Flame, NotebookText, Repeat2, ScrollText } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyActivityChart } from "@/features/progress/components/weekly-activity-chart";
import { getProgressSummary } from "@/server/repositories/study-repository";

export default async function ProgressPage() {
  const progress = await getProgressSummary();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tiến độ"
        title="Theo dõi hành trình học"
        description="Nhìn lại số từ gốc đã chinh phục, tần suất học theo tuần và những từ gốc bạn đã thật sự nắm chắc."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Từ gốc đã học" value={progress.totalRootWordsLearned} hint="Đã hoàn thành đủ buổi học mới" icon={<ScrollText className="size-5" />} />
        <StatCard label="Từ vựng đã học" value={progress.totalWordsLearned} hint="Tổng số từ vựng tích lũy" icon={<NotebookText className="size-5" />} />
        <StatCard label="Ôn tập đã xong" value={progress.totalReviewsCompleted} hint="Tổng lượt ôn tập hoàn thành" icon={<Repeat2 className="size-5" />} />
        <StatCard label="Chuỗi ngày" value={`${progress.streak} ngày`} hint={`Tỷ lệ hoàn thành ${progress.completionRate}%`} icon={<Flame className="size-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hoạt động 7 ngày gần nhất</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyActivityChart data={progress.weeklyActivity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Từ gốc đã nắm vững</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {progress.masteredRoots.map((rootWord) => (
            <div key={rootWord.id} className="rounded-[16px] border border-[color:var(--border)] bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold lowercase">{rootWord.root}</p>
                <Badge>{rootWord.level}</Badge>
              </div>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{rootWord.meaning}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
