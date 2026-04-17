import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddMemberForm, RemoveMemberButton, SuggestRootForm } from "@/features/classes/components/class-manager";

function formatSuggestionDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${value}T00:00:00`));
}

interface ClassMemberPanelProps {
  classId: string;
  members: Array<{
    id: string;
    profile: {
      full_name: string;
      username: string;
      role: string;
    };
  }>;
}

interface ClassSuggestionPanelProps {
  classId: string;
  rootWords: Array<{
    id: string;
    root: string;
    meaning: string;
  }>;
  suggestions: Array<{
    id: string;
    suggested_date: string;
    root_word: {
      root: string;
      meaning: string;
    };
  }>;
}

export function ClassMembersPanel({ classId, members }: ClassMemberPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Thêm học viên</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddMemberForm classId={classId} />
        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
              Lớp hiện chưa có thành viên nào. Hãy tìm và chọn học viên theo Họ và Tên để bắt đầu theo dõi tiến độ.
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-[color:var(--muted)] p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.profile.full_name}</p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    @{member.profile.username} · {member.profile.role === "teacher" ? "Giáo viên" : "Học viên"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">{member.profile.role === "teacher" ? "Giáo viên" : "Học viên"}</Badge>
                  {member.profile.role !== "teacher" ? (
                    <RemoveMemberButton classId={classId} memberId={member.id} memberName={member.profile.full_name} />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ClassSuggestionsPanel({
  classId,
  rootWords,
  suggestions,
}: ClassSuggestionPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bài tập từ giáo viên</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SuggestRootForm classId={classId} rootWords={rootWords} />
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
              Chưa có gợi ý nào được gửi cho lớp này.
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div key={suggestion.id} className="rounded-[14px] border border-[color:var(--border)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold lowercase">{suggestion.root_word.root}</p>
                    <p className="text-sm text-[color:var(--muted-foreground)]">{suggestion.root_word.meaning}</p>
                  </div>
                  <Badge>{formatSuggestionDate(suggestion.suggested_date)}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
