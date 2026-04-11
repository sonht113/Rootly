import { describe, expect, it } from "vitest";

import {
  getProfileDisplay,
  getProfileDisplayName,
  getProfileInitials,
  getProfileRoleLabel,
} from "@/lib/utils/profile";

describe("profile utils", () => {
  it("formats usernames by stripping role prefixes and title-casing tokens", () => {
    expect(getProfileDisplayName("student.son_nguyen")).toBe("Son Nguyen");
    expect(getProfileDisplayName("Teacher.minh-pham")).toBe("Minh Pham");
  });

  it("maps roles to the expected labels", () => {
    expect(getProfileRoleLabel("student")).toBe("Học viên");
    expect(getProfileRoleLabel("teacher")).toBe("Giáo viên");
    expect(getProfileRoleLabel("admin")).toBe("Quản trị viên");
  });

  it("derives initials from the formatted display name", () => {
    expect(getProfileInitials("Son Nguyen")).toBe("SN");
    expect(getProfileInitials("Rootly")).toBe("RO");
  });

  it("returns a complete profile display payload", () => {
    expect(
      getProfileDisplay({
        username: "admin.lexis_scholar",
        role: "admin",
      }),
    ).toEqual({
      displayName: "Lexis Scholar",
      roleLabel: "Quản trị viên",
      initials: "LS",
    });
  });

  it("falls back to Rootly when the username is missing", () => {
    expect(
      getProfileDisplay({
        username: "",
        role: "student",
      }),
    ).toEqual({
      displayName: "Rootly",
      roleLabel: "Học viên",
      initials: "RO",
    });
  });
});
