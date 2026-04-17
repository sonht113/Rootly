import { describe, expect, it } from "vitest";

import { buildExamRankingViewModel } from "@/features/ranking/lib/build-exam-ranking-view-model";
import type { ExamLeaderboardRow } from "@/types/domain";

const leaderboardFixture: ExamLeaderboardRow[] = [
  {
    rank: 1,
    user_id: "user-1",
    username: "alice",
    full_name: "Alice Nguyen",
    avatar_url: null,
    role: "student",
    score: 96,
    awarded_points: 24,
    total_points: 25,
    correct_answers: 24,
    total_questions: 25,
    duration_seconds: 540,
    submitted_at: "2026-04-14T10:00:00.000Z",
    is_current_user: false,
  },
  {
    rank: 2,
    user_id: "user-2",
    username: "bruno",
    full_name: "Bruno Pham",
    avatar_url: null,
    role: "student",
    score: 92,
    awarded_points: 23,
    total_points: 25,
    correct_answers: 23,
    total_questions: 25,
    duration_seconds: 620,
    submitted_at: "2026-04-14T10:03:00.000Z",
    is_current_user: false,
  },
  {
    rank: 3,
    user_id: "user-3",
    username: "cami",
    full_name: "Cami Tran",
    avatar_url: null,
    role: "student",
    score: 88,
    awarded_points: 22,
    total_points: 25,
    correct_answers: 22,
    total_questions: 25,
    duration_seconds: 700,
    submitted_at: "2026-04-14T10:05:00.000Z",
    is_current_user: false,
  },
  {
    rank: 4,
    user_id: "user-4",
    username: "dara",
    full_name: "Dara Le",
    avatar_url: null,
    role: "student",
    score: 80,
    awarded_points: 20,
    total_points: 25,
    correct_answers: 20,
    total_questions: 25,
    duration_seconds: 750,
    submitted_at: "2026-04-14T10:07:00.000Z",
    is_current_user: true,
  },
];

describe("buildExamRankingViewModel", () => {
  it("adds attempt duration to ranking status labels", () => {
    const viewModel = buildExamRankingViewModel(leaderboardFixture);

    expect(viewModel.podium).toHaveLength(3);
    expect(viewModel.allEntries).toHaveLength(1);
    expect(viewModel.allEntries[0]?.displayName).toBe("Dara Le");
    expect(viewModel.allEntries[0]?.statusLabel).toBe("20/25 đúng · 12:30");
    expect(viewModel.allEntries[0]?.isCurrentUser).toBe(true);
  });
});
