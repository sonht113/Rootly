import { describe, expect, it } from "vitest";

import { getTopbarSearchConfig } from "@/lib/navigation/topbar-search";

describe("getTopbarSearchConfig", () => {
  it("keeps /library as the default student search surface", () => {
    expect(getTopbarSearchConfig("/today")).toEqual({
      action: "/library",
      label: "Tìm trong thư viện",
      placeholder: "Tìm từ nguyên, từ gốc hoặc từ vựng...",
    });
  });

  it("uses the teacher namespace for default library searches", () => {
    expect(getTopbarSearchConfig("/teacher/classes")).toEqual({
      action: "/teacher/library",
      label: "Tìm trong thư viện",
      placeholder: "Tìm từ nguyên, từ gốc hoặc từ vựng...",
    });
  });

  it("keeps student roots inside the root artifact discovery surface", () => {
    expect(getTopbarSearchConfig("/roots/root-1")).toEqual({
      action: "/roots",
      label: "Tìm trong bản đồ từ gốc",
      placeholder: "Tìm từ gốc, nghĩa hoặc nguồn gốc...",
    });
  });

  it("uses the teacher namespace for roots searches", () => {
    expect(getTopbarSearchConfig("/teacher/roots/root-1")).toEqual({
      action: "/teacher/roots",
      label: "Tìm trong bản đồ từ gốc",
      placeholder: "Tìm từ gốc, nghĩa hoặc nguồn gốc...",
    });
  });

  it("routes admin content searches back to admin root management", () => {
    expect(getTopbarSearchConfig("/admin/root-words/new")).toEqual({
      action: "/admin/root-words",
      label: "Tìm trong nội dung từ gốc",
      placeholder: "Tìm từ gốc đang quản lý...",
    });
  });

  it("uses the admin namespace for default library searches", () => {
    expect(getTopbarSearchConfig("/admin/notifications")).toEqual({
      action: "/admin/library",
      label: "Tìm trong thư viện",
      placeholder: "Tìm từ nguyên, từ gốc hoặc từ vựng...",
    });
  });
});
