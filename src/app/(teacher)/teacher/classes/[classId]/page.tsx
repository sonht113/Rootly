import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankingRow } from "@/features/ranking/components/ranking-row";
import { AddMemberForm, SuggestRootForm } from "@/features/classes/components/class-manager";
import { getClassDetail } from "@/server/repositories/classes-repository";
import { getLeaderboard } from "@/server/repositories/ranking-repository";
import { getPublishedRootWords } from "@/server/repositories/root-words-repository";

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const [{ classData, summary }, rootWords, leaderboard] = await Promise.all([
    getClassDetail(classId),
    getPublishedRootWords(),
    getLeaderboard({
      period: "week",
      metric: "root_words_learned",
      scope: "class",
      classId,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chi tiết lớp"
        title={classData.name}
        description={classData.description ?? "Lớp học chưa có mô tả chi tiết."}
        badgeText={`${summary.memberCount} thành viên`}
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
        <Card>
          <CardHeader>
            <CardTitle>Thêm học viên</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddMemberForm classId={classId} />
            <div className="space-y-3">
              {classData.class_members?.map((member: { id: string; profile: { username: string; role: string } }) => (
                <div key={member.id} className="flex items-center justify-between rounded-[14px] bg-[color:var(--muted)] p-3">
                  <span className="font-medium">{member.profile.username}</span>
                  <Badge variant="outline">{member.profile.role === "teacher" ? "Giáo viên" : "Học viên"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gợi ý từ gốc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SuggestRootForm
              classId={classId}
              rootWords={rootWords.map((rootWord) => ({
                id: rootWord.id,
                root: rootWord.root,
                meaning: rootWord.meaning,
              }))}
            />
            <div className="space-y-3">
              {classData.class_root_suggestions?.map(
                (suggestion: { id: string; suggested_date: string; root_word: { root: string; meaning: string } }) => (
                  <div key={suggestion.id} className="rounded-[14px] border border-[color:var(--border)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold lowercase">{suggestion.root_word.root}</p>
                        <p className="text-sm text-[color:var(--muted-foreground)]">{suggestion.root_word.meaning}</p>
                      </div>
                      <Badge>{suggestion.suggested_date}</Badge>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
