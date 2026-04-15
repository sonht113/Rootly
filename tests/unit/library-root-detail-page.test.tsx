import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedGetCurrentProfile,
  mockedGetRootLearningSnapshot,
  mockedGetRootWordDetail,
  mockedGetRootWordQuizSummary,
  mockedGetRootWordReviewContext,
} = vi.hoisted(() => ({
  mockedGetCurrentProfile: vi.fn(),
  mockedGetRootLearningSnapshot: vi.fn(),
  mockedGetRootWordDetail: vi.fn(),
  mockedGetRootWordQuizSummary: vi.fn(),
  mockedGetRootWordReviewContext: vi.fn(),
}));

vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/features/root-words/components/root-word-detail-sections", () => ({
  RootWordDetailSections: ({ rootWord }: { rootWord: { root: string } }) => <div>{rootWord.root}</div>,
}));

vi.mock("@/features/root-words/components/root-word-quiz-actions", () => ({
  RootWordQuizActions: () => <div>quiz-actions</div>,
}));

vi.mock("@/features/root-words/components/root-word-review-actions", () => ({
  RootWordReviewActions: () => <div>review-actions</div>,
}));

vi.mock("@/features/study-plans/components/schedule-plan-dialog", () => ({
  SchedulePlanDialog: () => <div>schedule-dialog</div>,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: mockedGetCurrentProfile,
}));

vi.mock("@/server/repositories/root-words-repository", () => ({
  getRootWordDetail: mockedGetRootWordDetail,
}));

vi.mock("@/server/repositories/root-word-quizzes-repository", () => ({
  getRootWordQuizSummary: mockedGetRootWordQuizSummary,
}));

vi.mock("@/server/repositories/study-repository", () => ({
  getRootLearningSnapshot: mockedGetRootLearningSnapshot,
  getRootWordReviewContext: mockedGetRootWordReviewContext,
}));

import RootWordDetailPage from "@/app/(student)/library/[rootId]/page";

describe("student library root detail page", () => {
  beforeEach(() => {
    mockedGetRootWordDetail.mockReset();
    mockedGetCurrentProfile.mockReset();
    mockedGetRootLearningSnapshot.mockReset();
    mockedGetRootWordQuizSummary.mockReset();
    mockedGetRootWordReviewContext.mockReset();

    mockedGetRootWordDetail.mockResolvedValue({
      id: "root-1",
      root: "spect",
      meaning: "look",
      description: "to look",
      level: "basic",
    });
    mockedGetRootWordQuizSummary.mockResolvedValue({
      hasQuiz: true,
      questionCount: 10,
    });
    mockedGetRootLearningSnapshot.mockResolvedValue({
      hasPlan: false,
      nextReviewText: "Chưa có lịch học cho root này.",
      nextReviewDate: null,
    });
    mockedGetRootWordReviewContext.mockResolvedValue(null);
  });

  it("renders detail for student visitors without tracking a study session", async () => {
    mockedGetCurrentProfile.mockResolvedValue({
      role: "student",
    });

    render(await RootWordDetailPage({ params: Promise.resolve({ rootId: "root-1" }) }));

    expect(screen.getByRole("heading", { name: "spect" })).toBeInTheDocument();
  });

  it("renders detail for non-student visitors without tracking a study session", async () => {
    mockedGetCurrentProfile.mockResolvedValue({
      role: "admin",
    });

    render(await RootWordDetailPage({ params: Promise.resolve({ rootId: "root-1" }) }));

    expect(screen.getByRole("heading", { name: "spect" })).toBeInTheDocument();
  });
});
