import { describe, expect, it } from "vitest";

import { normalizeUsername, resolveLoginIdentifier, usernameToInternalEmail } from "@/lib/auth/username";

describe("username auth helpers", () => {
  it("normalizes usernames consistently", () => {
    expect(normalizeUsername(" Son.HT ")).toBe("son.ht");
  });

  it("maps username to internal email", () => {
    expect(usernameToInternalEmail("student_01")).toBe("student_01@auth.rootly.local");
  });

  it("keeps real emails unchanged during login resolution", () => {
    expect(resolveLoginIdentifier("hello@example.com")).toBe("hello@example.com");
    expect(resolveLoginIdentifier("Teacher.User")).toBe("teacher.user@auth.rootly.local");
  });
});
