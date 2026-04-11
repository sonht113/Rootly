import { describe, expect, it } from "vitest";

import { getAvatarFallback } from "@/lib/utils/avatar";

describe("getAvatarFallback", () => {
  it("returns the first two uppercase characters of the username", () => {
    expect(getAvatarFallback("student.minh")).toBe("ST");
  });

  it("trims whitespace before creating the fallback", () => {
    expect(getAvatarFallback("  lan  ")).toBe("LA");
  });

  it("returns RL when username is missing", () => {
    expect(getAvatarFallback("")).toBe("RL");
    expect(getAvatarFallback(null)).toBe("RL");
    expect(getAvatarFallback(undefined)).toBe("RL");
  });
});
