import { describe, expect, it } from "vitest";

import { getTopbarSearchConfig } from "@/lib/navigation/topbar-search";

describe("getTopbarSearchConfig", () => {
  it("keeps /library as the default search surface", () => {
    expect(getTopbarSearchConfig("/today")).toEqual({
      action: "/library",
      label: "Tìm trong thư viện",
      placeholder: "Tìm từ nguyên, từ gốc hoặc từ vựng...",
    });
  });

  it("keeps /roots inside the root artifact discovery surface", () => {
    expect(getTopbarSearchConfig("/roots/root-1")).toEqual({
      action: "/roots",
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
});
