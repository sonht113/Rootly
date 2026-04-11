import { describe, expect, it } from "vitest";

import { getStreakCapForPeriod } from "@/lib/utils/ranking";

describe("ranking streak cap semantics", () => {
  it("caps streak according to selected period", () => {
    expect(getStreakCapForPeriod("today")).toBe(1);
    expect(getStreakCapForPeriod("week")).toBe(7);
    expect(getStreakCapForPeriod("month")).toBe(31);
    expect(getStreakCapForPeriod("all")).toBeNull();
  });
});

