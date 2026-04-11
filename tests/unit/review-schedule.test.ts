import { describe, expect, it } from "vitest";

import { buildReviewDates } from "@/lib/utils/date";

describe("review scheduling helpers", () => {
  it("builds D+1, D+3, D+7 review dates", () => {
    const [day1, day3, day7] = buildReviewDates(new Date("2026-04-10T00:00:00.000Z"));

    expect(day1.toISOString().slice(0, 10)).toBe("2026-04-11");
    expect(day3.toISOString().slice(0, 10)).toBe("2026-04-13");
    expect(day7.toISOString().slice(0, 10)).toBe("2026-04-17");
  });
});

