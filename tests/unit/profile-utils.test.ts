import { describe, expect, it } from "vitest";

import {
  getProfileDisplay,
  getProfileDisplayName,
  getProfileInitials,
  getProfileRoleLabel,
  normalizeProfileSearchText,
} from "@/lib/utils/profile";

describe("profile utils", () => {
  it("prefers full_name before username-derived fallbacks", () => {
    expect(getProfileDisplayName("Nguyễn Văn An", "student.son_nguyen")).toBe("Nguyễn Văn An");
  });

  it("formats usernames by stripping role prefixes and title-casing tokens when full_name is missing", () => {
    expect(getProfileDisplayName("", "student.son_nguyen")).toBe("Son Nguyen");
    expect(getProfileDisplayName(null, "Teacher.minh-pham")).toBe("Minh Pham");
  });

  it("maps roles to the expected labels", () => {
    expect(getProfileRoleLabel("student")).toBe("Học viên");
    expect(getProfileRoleLabel("teacher")).toBe("Giáo viên");
    expect(getProfileRoleLabel("admin")).toBe("Quản trị viên");
  });

  it("normalizes profile search text for accent-insensitive lookups", () => {
    expect(normalizeProfileSearchText("  Nguyễn   Văn_An  ")).toBe("nguyen van an");
  });

  it("derives initials from the formatted display name", () => {
    expect(getProfileInitials("Nguyễn Văn An")).toBe("NA");
    expect(getProfileInitials("Rootly")).toBe("RO");
  });

  it("returns a complete profile display payload", () => {
    expect(
      getProfileDisplay({
        full_name: "Lê Minh Khang",
        username: "admin.lexis_scholar",
        role: "admin",
      }),
    ).toEqual({
      displayName: "Lê Minh Khang",
      roleLabel: "Quản trị viên",
      initials: "LK",
    });
  });

  it("falls back to Rootly when both full_name and username are missing", () => {
    expect(
      getProfileDisplay({
        full_name: "",
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
