import { describe, expect, it } from "vitest";

import { deriveRootLearningStatus } from "@/lib/root-learning-status";

describe("deriveRootLearningStatus", () => {
  it("prioritizes active reviews over remembered reviews", () => {
    expect(
      deriveRootLearningStatus(
        [{ status: "completed" }],
        [{ status: "done" }, { status: "pending" }],
      ),
    ).toBe("reviewing");
  });

  it("returns remembered when only completed reviews remain", () => {
    expect(
      deriveRootLearningStatus(
        [{ status: "completed" }],
        [{ status: "done" }],
      ),
    ).toBe("remembered");
  });

  it("returns completed when the root has been learned but has no reviews yet", () => {
    expect(
      deriveRootLearningStatus(
        [{ status: "completed" }],
        [],
      ),
    ).toBe("completed");
  });
});
