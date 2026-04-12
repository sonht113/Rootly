import type { UserRootPlanStatus, UserRootReviewStatus } from "@/types/domain";

export type RootLearningStatus = "completed" | "reviewing" | "remembered" | null;

export function deriveRootLearningStatus(
  plans: Array<{ status: UserRootPlanStatus | string }>,
  reviews: Array<{ status: UserRootReviewStatus | string }>,
): RootLearningStatus {
  if (reviews.some((review) => review.status === "done")) {
    return "remembered";
  }

  if (reviews.some((review) => review.status === "pending" || review.status === "rescheduled")) {
    return "reviewing";
  }

  if (plans.some((plan) => plan.status === "completed")) {
    return "completed";
  }

  return null;
}
