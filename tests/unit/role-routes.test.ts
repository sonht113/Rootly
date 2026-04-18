import { describe, expect, it } from "vitest";

import {
  getAdminUsersPath,
  getCanonicalPathForRole,
  getRoleClassesPath,
  getRoleFromPathname,
  getRoleHomePath,
  getRoleLibraryPath,
} from "@/lib/navigation/role-routes";

describe("role-routes", () => {
  it("returns the correct role home path", () => {
    expect(getRoleHomePath("student")).toBe("/today");
    expect(getRoleHomePath("teacher")).toBe("/teacher/classes");
    expect(getRoleHomePath("admin")).toBe("/admin/root-words");
  });

  it("detects the role from pathname", () => {
    expect(getRoleFromPathname("/today")).toBe("student");
    expect(getRoleFromPathname("/teacher/library")).toBe("teacher");
    expect(getRoleFromPathname("/admin/root-words")).toBe("admin");
  });

  it("maps shared teacher paths into the teacher namespace", () => {
    expect(getCanonicalPathForRole("teacher", "/library/root-1")).toBe("/teacher/library/root-1");
    expect(getCanonicalPathForRole("teacher", "/classes/class-1")).toBe("/teacher/classes/class-1");
  });

  it("maps admin access from teacher pages into the admin namespace", () => {
    expect(getCanonicalPathForRole("admin", "/teacher/classes/class-1")).toBe("/admin/classes/class-1");
    expect(getCanonicalPathForRole("admin", "/teacher/exams/exam-1")).toBe("/admin/exams/exam-1");
  });

  it("falls back to the role home for student-only pages", () => {
    expect(getCanonicalPathForRole("teacher", "/today")).toBe("/teacher/classes");
    expect(getCanonicalPathForRole("admin", "/reviews")).toBe("/admin/root-words");
    expect(getCanonicalPathForRole("admin", "/quiz/root-1")).toBe("/admin/root-words");
  });

  it("treats admin-only user management as admin namespace only", () => {
    expect(getAdminUsersPath()).toBe("/admin/users");
    expect(getCanonicalPathForRole("teacher", "/admin/users")).toBe("/teacher/classes");
    expect(getCanonicalPathForRole("student", "/admin/users")).toBe("/today");
  });

  it("keeps already-canonical paths unchanged", () => {
    expect(getCanonicalPathForRole("student", getRoleLibraryPath("student"))).toBeNull();
    expect(getCanonicalPathForRole("teacher", getRoleClassesPath("teacher"))).toBeNull();
  });
});
