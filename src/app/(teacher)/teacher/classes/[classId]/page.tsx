import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClassExamsPanel } from "@/features/classes/components/class-exams-panel";
import { ClassMembersPanel, ClassSuggestionsPanel } from "@/features/classes/components/class-detail-panels";
import { RankingRow } from "@/features/ranking/components/ranking-row";
import { getClassDetail } from "@/server/repositories/classes-repository";
import { getManageableExams } from "@/server/repositories/exams-repository";
import { getLeaderboard } from "@/server/repositories/ranking-repository";
import { getPublishedRootWords } from "@/server/repositories/root-words-repository";

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const [{ classData, summary }, rootWords, leaderboard, exams] = await Promise.all([
    getClassDetail(classId),
    getPublishedRootWords(),
    getLeaderboard({
      period: "week",
      metric: "root_words_learned",
      scope: "class",
      classId,
    }),
    getManageableExams(),
  ]);
  const classExams = exams.filter((exam) => exam.class_id === classId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chi tiết lớp"
        title={classData.name}
        description={classData.description ?? "Lớp học chưa có mô tả chi tiết."}
        badgeText={`${summary.memberCount} thành viên`}
        action={
          <Button asChild variant="outline">
            <Link href={`/teacher/exams?classId=${classId}`}>Tạo kỳ thi cho lớp</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Thành viên</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.memberCount}</p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Số người đang tham gia lớp</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Từ gốc đã hoàn thành</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.completedRoots}</p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Tổng số từ gốc đã hoàn tất bởi thành viên lớp</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ôn tập chờ xử lý</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.pendingReviews}</p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Các lượt ôn tập đang đến hạn trong lớp</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ClassMembersPanel classId={classId} members={classData.class_members ?? []} />
        <ClassSuggestionsPanel
          classId={classId}
          rootWords={rootWords.map((rootWord) => ({
            id: rootWord.id,
            root: rootWord.root,
            meaning: rootWord.meaning,
          }))}
          suggestions={classData.class_root_suggestions ?? []}
        />
      </div>

      <ClassExamsPanel
        title="Kỳ thi của lớp"
        description="Theo dõi các đề thi đã gắn với lớp này và mở nhanh vào màn hình cấu hình hoặc kết quả."
        emptyMessage="Chưa có kỳ thi nào được gắn với lớp này."
        audience="teacher"
        exams={classExams}
        hrefBuilder={(examId) => `/teacher/exams/${examId}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Bảng xếp hạng trong lớp</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hạng</TableHead>
                <TableHead>Người học</TableHead>
                <TableHead>Điểm chỉ số</TableHead>
                <TableHead>Từ gốc</TableHead>
                <TableHead>Từ vựng</TableHead>
                <TableHead>Lượt ôn</TableHead>
                <TableHead>Chuỗi ngày</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((row) => (
                <RankingRow key={row.user_id} row={row} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
