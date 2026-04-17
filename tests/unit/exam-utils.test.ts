import { describe, expect, it } from "vitest";

import {
  buildExamRankingInsights,
  formatExamDuration,
  getExamAttemptDeadline,
  getExamAttemptDurationFromRow,
  getExamAttemptRemainingSeconds,
  getExamAttemptRuntimeState,
  getExamAvailabilityState,
  getExamRankingStatusTier,
  isExamAttemptExpired,
} from "@/lib/utils/exams";
import type { ExamLeaderboardRow } from "@/types/domain";

const leaderboardFixture: ExamLeaderboardRow[] = [
  {
    rank: 1,
    user_id: "user-1",
    username: "alice",
    full_name: "Alice Nguyen",
    avatar_url: null,
    role: "student",
    score: 95,
    awarded_points: 19,
    total_points: 20,
    correct_answers: 19,
    total_questions: 20,
    duration_seconds: 510,
    submitted_at: "2026-04-14T10:00:00.000Z",
    is_current_user: false,
  },
  {
    rank: 2,
    user_id: "user-2",
    username: "bob",
    full_name: "Bob Tran",
    avatar_url: null,
    role: "student",
    score: 80,
    awarded_points: 16,
    total_points: 20,
    correct_answers: 16,
    total_questions: 20,
    duration_seconds: 750,
    submitted_at: "2026-04-14T10:10:00.000Z",
    is_current_user: true,
  },
];

describe("exam utils", () => {
  it("builds ranking insights from submitted exam attempts", () => {
    const insights = buildExamRankingInsights(leaderboardFixture);

    expect(insights.currentUserRank).toBe(2);
    expect(insights.currentUserScore).toBe(80);
    expect(insights.nextRank).toBe(1);
    expect(insights.pointsToNextRank).toBe(15);
    expect(insights.participantCount).toBe(2);
    expect(insights.averageScore).toBe(88);
    expect(insights.topScore).toBe(95);
  });

  it("derives the correct availability state for finalized and scheduled exams", () => {
    expect(
      getExamAvailabilityState({
        exam: {
          status: "published",
          starts_at: "2099-04-14T10:00:00.000Z",
          ends_at: "2099-04-14T11:00:00.000Z",
        },
      }),
    ).toBe("upcoming");

    expect(
      getExamAvailabilityState({
        exam: {
          status: "published",
          starts_at: null,
          ends_at: null,
        },
        attemptStatus: "expired",
      }),
    ).toBe("submitted");
  });

  it("computes the effective deadline using the earlier of duration and exam end time", () => {
    expect(
      getExamAttemptDeadline({
        startedAt: "2026-04-15T02:00:00.000Z",
        durationMinutes: 30,
        examEndsAt: "2026-04-15T03:00:00.000Z",
      }),
    ).toBe("2026-04-15T02:30:00.000Z");

    expect(
      getExamAttemptDeadline({
        startedAt: "2026-04-15T02:00:00.000Z",
        durationMinutes: null,
        examEndsAt: "2026-04-15T03:00:00.000Z",
      }),
    ).toBe("2026-04-15T03:00:00.000Z");
  });

  it("tracks remaining time and runtime expiration state", () => {
    const runtime = getExamAttemptRuntimeState({
      exam: {
        duration_minutes: 20,
        ends_at: "2026-04-15T02:30:00.000Z",
      },
      attempt: {
        started_at: "2026-04-15T02:00:00.000Z",
        status: "started",
      },
      now: new Date("2026-04-15T02:10:10.000Z"),
    });

    expect(runtime.deadlineAt).toBe("2026-04-15T02:20:00.000Z");
    expect(runtime.remainingSeconds).toBe(590);
    expect(runtime.isExpired).toBe(false);
    expect(runtime.isTimed).toBe(true);
  });

  it("detects expired attempts and formats zero duration for countdowns", () => {
    const deadlineAt = "2026-04-15T02:20:00.000Z";

    expect(
      getExamAttemptRemainingSeconds({
        deadlineAt,
        now: new Date("2026-04-15T02:20:00.100Z"),
      }),
    ).toBe(0);
    expect(
      isExamAttemptExpired({
        deadlineAt,
        now: new Date("2026-04-15T02:20:00.100Z"),
      }),
    ).toBe(true);
    expect(formatExamDuration(0)).toBe("00:00");
  });

  it("maps exam score bands to ranking tiers", () => {
    expect(getExamRankingStatusTier(96)).toBe("polyglot");
    expect(getExamRankingStatusTier(75)).toBe("curator");
    expect(getExamRankingStatusTier(40)).toBe("novice");
  });

  it("formats attempt duration from stored timestamps", () => {
    const seconds = getExamAttemptDurationFromRow({
      started_at: "2026-04-14T10:00:00.000Z",
      submitted_at: "2026-04-14T10:12:30.000Z",
    });

    expect(seconds).toBe(750);
    expect(formatExamDuration(seconds)).toBe("12:30");
  });
});
