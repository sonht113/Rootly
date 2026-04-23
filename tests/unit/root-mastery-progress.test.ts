import { describe, expect, it } from "vitest";

import { calculateRootMasteryProgress } from "@/lib/root-mastery-progress";

describe("calculateRootMasteryProgress", () => {
  it("returns 10 percent after the learner reaches the end of the detail page", () => {
    expect(
      calculateRootMasteryProgress({
        hasCompletedDetailView: true,
        hasCompletedQuiz: false,
        completedReviewSteps: 0,
        isRemembered: false,
      }),
    ).toBe(10);
  });

  it("returns 50 percent after detail completion and quiz submission", () => {
    expect(
      calculateRootMasteryProgress({
        hasCompletedDetailView: true,
        hasCompletedQuiz: true,
        completedReviewSteps: 0,
        isRemembered: false,
      }),
    ).toBe(50);
  });

  it("adds 10 percent for each distinct review step before remembered", () => {
    expect(
      calculateRootMasteryProgress({
        hasCompletedDetailView: true,
        hasCompletedQuiz: true,
        completedReviewSteps: 2,
        isRemembered: false,
      }),
    ).toBe(70);
  });

  it("caps the progress at 100 when the learner marks the root as remembered", () => {
    expect(
      calculateRootMasteryProgress({
        hasCompletedDetailView: true,
        hasCompletedQuiz: true,
        completedReviewSteps: 3,
        isRemembered: true,
      }),
    ).toBe(100);
  });
});
