import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedGetCurrentSession,
  mockedRequireRole,
  mockedRevalidatePath,
  mockedSetTodayDailyRootRecommendation,
} = vi.hoisted(() => ({
  mockedGetCurrentSession: vi.fn(),
  mockedRequireRole: vi.fn(),
  mockedRevalidatePath: vi.fn(),
  mockedSetTodayDailyRootRecommendation: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockedRevalidatePath,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentSession: mockedGetCurrentSession,
  requireRole: mockedRequireRole,
}));

vi.mock("@/server/repositories/daily-root-recommendations-repository", () => ({
  setTodayDailyRootRecommendation: mockedSetTodayDailyRootRecommendation,
}));

vi.mock("@/server/repositories/root-words-repository", () => ({
  upsertRootWord: vi.fn(),
  deleteRootWord: vi.fn(),
}));

import { setTodayRecommendedRootWordAction } from "@/features/admin-content/actions/root-words";

describe("setTodayRecommendedRootWordAction", () => {
  beforeEach(() => {
    mockedGetCurrentSession.mockReset();
    mockedRequireRole.mockReset();
    mockedRevalidatePath.mockReset();
    mockedSetTodayDailyRootRecommendation.mockReset();

    mockedRequireRole.mockResolvedValue({
      auth_user_id: "admin-1",
      role: "admin",
    });
    mockedSetTodayDailyRootRecommendation.mockResolvedValue({
      rootWordId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("validates admin access, stores today's recommendation, and revalidates relevant pages", async () => {
    await setTodayRecommendedRootWordAction("11111111-1111-4111-8111-111111111111");

    expect(mockedRequireRole).toHaveBeenCalledWith(["admin"]);
    expect(mockedSetTodayDailyRootRecommendation).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "admin-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/root-words");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/roots");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/today");
  });
});
