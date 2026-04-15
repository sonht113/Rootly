import type {
  ExamAttemptRow,
  ExamAttemptRuntimeState,
  ExamAttemptStatus,
  ExamLeaderboardRow,
  ExamRankingInsightData,
  ExamRow,
  ExamScope,
  ExamStatus,
  RankingStatusTier,
} from "@/types/domain";

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

export type ExamAvailabilityState = "draft" | "upcoming" | "open" | "submitted" | "closed";

export function toSupabaseDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getExamScopeLabel(scope: ExamScope) {
  return scope === "class" ? "Lớp học" : "Toàn hệ thống";
}

export function getExamStatusLabel(status: ExamStatus) {
  switch (status) {
    case "draft":
      return "Nháp";
    case "closed":
      return "Đã đóng";
    case "published":
    default:
      return "Đang phát hành";
  }
}

export function formatExamWindow(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) {
    return "Mở tự do";
  }

  if (startsAt && endsAt) {
    return `${dateTimeFormatter.format(new Date(startsAt))} - ${dateTimeFormatter.format(new Date(endsAt))}`;
  }

  if (startsAt) {
    return `Từ ${dateTimeFormatter.format(new Date(startsAt))}`;
  }

  return `Đến ${dateTimeFormatter.format(new Date(endsAt!))}`;
}

export function isFinalizedExamAttemptStatus(status: ExamAttemptStatus | null | undefined) {
  return status === "submitted" || status === "expired";
}

export function getExamAttemptDeadline({
  startedAt,
  durationMinutes,
  examEndsAt,
}: {
  startedAt: string | null;
  durationMinutes: number | null;
  examEndsAt: string | null;
}) {
  const startedAtDate = startedAt ? new Date(startedAt) : null;
  const examEndsAtDate = examEndsAt ? new Date(examEndsAt) : null;

  const deadlines = [
    startedAtDate &&
    !Number.isNaN(startedAtDate.getTime()) &&
    typeof durationMinutes === "number" &&
    Number.isFinite(durationMinutes)
      ? new Date(startedAtDate.getTime() + durationMinutes * 60_000)
      : null,
    examEndsAtDate && !Number.isNaN(examEndsAtDate.getTime()) ? examEndsAtDate : null,
  ].filter((value): value is Date => value instanceof Date);

  if (deadlines.length === 0) {
    return null;
  }

  const earliestDeadline = deadlines.reduce((current, candidate) =>
    candidate.getTime() < current.getTime() ? candidate : current,
  );

  return earliestDeadline.toISOString();
}

export function getExamAttemptRemainingSeconds({
  deadlineAt,
  now = new Date(),
}: {
  deadlineAt: string | null;
  now?: Date;
}) {
  if (!deadlineAt) {
    return null;
  }

  const deadline = new Date(deadlineAt);
  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 1000));
}

export function isExamAttemptExpired({
  deadlineAt,
  now = new Date(),
}: {
  deadlineAt: string | null;
  now?: Date;
}) {
  if (!deadlineAt) {
    return false;
  }

  const deadline = new Date(deadlineAt);
  if (Number.isNaN(deadline.getTime())) {
    return false;
  }

  return deadline.getTime() <= now.getTime();
}

export function getExamAttemptRuntimeState({
  exam,
  attempt,
  now = new Date(),
}: {
  exam: Pick<ExamRow, "duration_minutes" | "ends_at">;
  attempt: Pick<ExamAttemptRow, "started_at" | "status">;
  now?: Date;
}): ExamAttemptRuntimeState {
  const deadlineAt = getExamAttemptDeadline({
    startedAt: attempt.started_at,
    durationMinutes: exam.duration_minutes,
    examEndsAt: exam.ends_at,
  });

  return {
    deadlineAt,
    remainingSeconds: getExamAttemptRemainingSeconds({ deadlineAt, now }),
    isTimed: deadlineAt !== null,
    isExpired: attempt.status === "expired" || (attempt.status === "started" && isExamAttemptExpired({ deadlineAt, now })),
  };
}

export function getExamAvailabilityState({
  exam,
  attemptStatus,
  now = new Date(),
}: {
  exam: Pick<ExamRow, "status" | "starts_at" | "ends_at">;
  attemptStatus?: ExamAttemptStatus | null;
  now?: Date;
}): ExamAvailabilityState {
  if (isFinalizedExamAttemptStatus(attemptStatus)) {
    return "submitted";
  }

  if (exam.status === "draft") {
    return "draft";
  }

  if (exam.status === "closed") {
    return "closed";
  }

  if (exam.starts_at && new Date(exam.starts_at).getTime() > now.getTime()) {
    return "upcoming";
  }

  if (exam.ends_at && new Date(exam.ends_at).getTime() < now.getTime()) {
    return "closed";
  }

  return "open";
}

export function getExamAvailabilityLabel(state: ExamAvailabilityState) {
  switch (state) {
    case "draft":
      return "Bản nháp";
    case "upcoming":
      return "Sắp mở";
    case "submitted":
      return "Đã nộp bài";
    case "closed":
      return "Đã đóng";
    case "open":
    default:
      return "Đang mở";
  }
}

export function getExamAvailabilityBadgeVariant(state: ExamAvailabilityState): "outline" | "warning" | "success" | "danger" {
  switch (state) {
    case "open":
      return "success";
    case "submitted":
      return "warning";
    case "closed":
      return "danger";
    case "draft":
    case "upcoming":
    default:
      return "outline";
  }
}

export function formatExamScore(score: number | null) {
  return score === null ? "Chưa có điểm" : `${score}%`;
}

export function getExamAttemptDurationSeconds({
  startedAt,
  submittedAt,
  now = new Date(),
}: {
  startedAt: string;
  submittedAt?: string | null;
  now?: Date;
}) {
  const start = new Date(startedAt);
  const end = submittedAt ? new Date(submittedAt) : now;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000));
}

export function getExamAttemptDurationFromRow(attempt: Pick<ExamAttemptRow, "started_at" | "submitted_at">) {
  return getExamAttemptDurationSeconds({
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
  });
}

export function formatExamDuration(durationSeconds: number | null) {
  if (durationSeconds === null || !Number.isFinite(durationSeconds)) {
    return "--";
  }

  const totalSeconds = Math.max(0, Math.round(durationSeconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${`${minutes}`.padStart(2, "0")}:${`${seconds}`.padStart(2, "0")}`;
  }

  return `${`${minutes}`.padStart(2, "0")}:${`${seconds}`.padStart(2, "0")}`;
}

export function buildExamRankingInsights(leaderboard: ExamLeaderboardRow[]): ExamRankingInsightData {
  const currentUser = leaderboard.find((entry) => entry.is_current_user) ?? null;
  const nextRank = currentUser ? leaderboard.find((entry) => entry.rank === currentUser.rank - 1) ?? null : null;
  const averageScore =
    leaderboard.length > 0
      ? Math.round(leaderboard.reduce((total, entry) => total + entry.score, 0) / leaderboard.length)
      : 0;
  const topScore = leaderboard[0]?.score ?? 0;
  const percentile =
    currentUser && leaderboard.length > 1
      ? Math.max(0, Math.min(100, Math.round(((leaderboard.length - currentUser.rank) / leaderboard.length) * 100)))
      : currentUser
        ? 100
        : 0;
  const pointsToNextRank =
    currentUser && nextRank ? Math.max(nextRank.score - currentUser.score, 0) : 0;
  const progressPercent =
    currentUser && nextRank && nextRank.score > currentUser.score
      ? Math.max(8, Math.min(99, Math.round((currentUser.score / nextRank.score) * 100)))
      : currentUser
        ? 100
        : 0;

  return {
    currentUserRank: currentUser?.rank ?? null,
    currentUserScore: currentUser?.score ?? null,
    percentile,
    nextRank: nextRank?.rank ?? null,
    nextRankScore: nextRank?.score ?? null,
    pointsToNextRank,
    progressPercent,
    participantCount: leaderboard.length,
    averageScore,
    topScore,
    currentUserCorrectAnswers: currentUser?.correct_answers ?? null,
    currentUserTotalQuestions: currentUser?.total_questions ?? null,
  };
}

export function getExamRankingStatusTier(score: number): RankingStatusTier {
  if (score >= 90) {
    return "polyglot";
  }

  if (score >= 70) {
    return "curator";
  }

  return "novice";
}
