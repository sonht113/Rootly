import { describe, expect, it } from "vitest";

import { registerSchema } from "@/lib/validations/auth";

describe("register schema", () => {
  it("accepts Vietnamese full names and normalizes whitespace", () => {
    const parsed = registerSchema.safeParse({
      fullName: "  Nguyễn   Văn   An  ",
      username: "lexis_scholar",
      email: "",
      password: "StrongPass1",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.fullName).toBe("Nguyễn Văn An");
  });

  it("rejects invalid full names during registration", () => {
    const parsed = registerSchema.safeParse({
      fullName: "1",
      username: "lexis_scholar",
      email: "",
      password: "StrongPass1",
    });

    expect(parsed.success).toBe(false);
  });
});
