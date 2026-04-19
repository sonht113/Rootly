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

vi.mock("@/features/root-words/components/root-artifact-hero", () => ({
  RootArtifactHero: ({ rootWord }: { rootWord: { root: string } }) => <div>{rootWord.root}</div>,
}));

vi.mock("@/features/root-words/components/root-word-detail-sections", () => ({
  RootWordDetailSections: ({
    rootWord,
    summaryAction,
    completionTracker,
  }: {
    rootWord: { root: string };
    summaryAction?: React.ReactNode;
    completionTracker?: React.ReactNode;
  }) => (
    <div>
      <div>{rootWord.root}</div>
      {summaryAction}
      {completionTracker}
    </div>
  ),
}));

vi.mock("@/features/root-words/components/root-word-detail-streak-tracker", () => ({
  RootWordDetailStreakTracker: () => <div>streak-tracker</div>,
}));

vi.mock("@/features/root-words/components/root-word-quiz-actions", () => ({
  RootWordQuizActions: () => <div>quiz-actions</div>,
}));

vi.mock("@/features/root-words/components/root-word-review-actions", () => ({
  RootWordReviewActions: () => <div>review-actions</div>,
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

import RootArtifactPage from "@/app/(student)/roots/[rootId]/page";

describe("student root artifact page", () => {
  beforeEach(() => {
    mockedGetCurrentProfile.mockReset();
    mockedGetRootLearningSnapshot.mockReset();
    mockedGetRootWordDetail.mockReset();
    mockedGetRootWordQuizSummary.mockReset();
    mockedGetRootWordReviewContext.mockReset();

    mockedGetRootLearningSnapshot.mockResolvedValue({
      hasPlan: true,
      nextReviewDate: null,
      nextReviewText: "next review text",
    });
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
    mockedGetRootWordReviewContext.mockResolvedValue(null);
  });

  it("renders the artifact detail with the streak tracker", async () => {
    mockedGetCurrentProfile.mockResolvedValue({
      role: "student",
    });

    render(await RootArtifactPage({ params: Promise.resolve({ rootId: "root-1" }) }));

    expect(screen.getAllByText("spect")).not.toHaveLength(0);
    expect(screen.getByText("quiz-actions")).toBeInTheDocument();
    expect(screen.getByText("streak-tracker")).toBeInTheDocument();
  });
});
