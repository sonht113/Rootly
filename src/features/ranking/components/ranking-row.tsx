import { Medal } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { getAvatarFallback } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils/cn";
import type { RankingRow as RankingRowType } from "@/types/domain";

export function RankingRow({ row }: { row: RankingRowType }) {
  return (
    <TableRow className={cn(row.is_current_user && "bg-[color:var(--primary-soft)]/50")}>
      <TableCell className="font-semibold">
        <div className="flex items-center gap-2">
          {row.rank <= 3 ? <Medal className="size-4 text-[color:var(--accent)]" /> : null}
          #{row.rank}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{getAvatarFallback(row.username)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.username}</p>
            <p className="text-xs capitalize text-[color:var(--muted-foreground)]">{getRoleLabel(row.role)}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>{row.metric_value}</TableCell>
      <TableCell>{row.root_words_learned}</TableCell>
      <TableCell>{row.words_learned}</TableCell>
      <TableCell>{row.reviews_completed}</TableCell>
      <TableCell>
        <Badge variant="warning">{row.streak} ngày</Badge>
      </TableCell>
    </TableRow>
  );
}

function getRoleLabel(role: string) {
  switch (role) {
    case "teacher":
      return "Giáo viên";
    case "admin":
      return "Quản trị viên";
    case "student":
    default:
      return "Học viên";
  }
}
