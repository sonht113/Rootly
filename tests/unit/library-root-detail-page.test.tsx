import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedGetCurrentProfile,
  mockedGetRootWordDetail,
  mockedGetRootWordQuizSummary,
  mockedGetRootWordReviewContext,
  mockedRecordRootWordDetailView,
} = vi.hoisted(() => ({
  mockedGetCurrentProfile: vi.fn(),
  mockedGetRootWordDetail: vi.fn(),
  mockedGetRootWordQuizSummary: vi.fn(),
  mockedGetRootWordReviewContext: vi.fn(),
  mockedRecordRootWordDetailView: vi.fn(),
}));

vi.mock("@/components/shared/refresh-on-mount", () => ({
  RefreshOnMount: ({ enabled }: { enabled: boolean }) => <div data-testid="refresh-on-mount">{String(enabled)}</div>,
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
  getRootWordReviewContext: mockedGetRootWordReviewContext,
  recordRootWordDetailView: mockedRecordRootWordDetailView,
}));

import RootWordDetailPage from "@/app/(student)/library/[rootId]/page";

describe("student library root detail page", () => {
  beforeEach(() => {
    mockedGetRootWordDetail.mockReset();
    mockedGetCurrentProfile.mockReset();
    mockedGetRootWordQuizSummary.mockReset();
    mockedGetRootWordReviewContext.mockReset();
    mockedRecordRootWordDetailView.mockReset();

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

  it("records a detail-view streak for student visitors and requests a refresh when newly recorded", async () => {
    mockedGetCurrentProfile.mockResolvedValue({
      role: "student",
    });
    mockedRecordRootWordDetailView.mockResolvedValue({
      recorded: true,
      sessionId: "session-1",
    });

    render(await RootWordDetailPage({ params: Promise.resolve({ rootId: "root-1" }) }));

    expect(mockedRecordRootWordDetailView).toHaveBeenCalledWith("root-1");
    expect(screen.getByTestId("refresh-on-mount")).toHaveTextContent("true");
    expect(screen.getByRole("heading", { name: "spect" })).toBeInTheDocument();
  });

  it("does not record a detail-view streak for non-student visitors", async () => {
    mockedGetCurrentProfile.mockResolvedValue({
      role: "admin",
    });

    render(await RootWordDetailPage({ params: Promise.resolve({ rootId: "root-1" }) }));

    expect(mockedRecordRootWordDetailView).not.toHaveBeenCalled();
    expect(screen.getByTestId("refresh-on-mount")).toHaveTextContent("false");
  });
});
