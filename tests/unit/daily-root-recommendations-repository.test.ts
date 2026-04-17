import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedServerRecommendationEq,
  mockedServerRecommendationMaybeSingle,
  mockedAdminRootEq,
  mockedAdminRootMaybeSingle,
  mockedAdminRecommendationUpsert,
  mockedAdminRecommendationSingle,
} = vi.hoisted(() => ({
  mockedServerRecommendationEq: vi.fn(),
  mockedServerRecommendationMaybeSingle: vi.fn(),
  mockedAdminRootEq: vi.fn(),
  mockedAdminRootMaybeSingle: vi.fn(),
  mockedAdminRecommendationUpsert: vi.fn(),
  mockedAdminRecommendationSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table !== "daily_root_recommendations") {
        throw new Error(`Unexpected server table mock: ${table}`);
      }

      const query = {
        eq: mockedServerRecommendationEq,
        maybeSingle: mockedServerRecommendationMaybeSingle,
      };

      mockedServerRecommendationEq.mockImplementation(() => query);

      return {
        select: () => query,
      };
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "root_words") {
        const query = {
          eq: mockedAdminRootEq,
          maybeSingle: mockedAdminRootMaybeSingle,
        };

        mockedAdminRootEq.mockImplementation(() => query);

        return {
          select: () => query,
        };
      }

      if (table === "daily_root_recommendations") {
        const selectQuery = {
          single: mockedAdminRecommendationSingle,
        };

        const upsertQuery = {
          select: () => selectQuery,
        };

        mockedAdminRecommendationUpsert.mockImplementation(() => upsertQuery);

        return {
          upsert: mockedAdminRecommendationUpsert,
        };
      }

      throw new Error(`Unexpected admin table mock: ${table}`);
    },
  })),
}));

import {
  getDailyRootRecommendationForDate,
  setTodayDailyRootRecommendation,
} from "@/server/repositories/daily-root-recommendations-repository";

describe("daily root recommendations repository", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T09:00:00+07:00"));

    mockedServerRecommendationEq.mockReset();
    mockedServerRecommendationMaybeSingle.mockReset();
    mockedAdminRootEq.mockReset();
    mockedAdminRootMaybeSingle.mockReset();
    mockedAdminRecommendationUpsert.mockReset();
    mockedAdminRecommendationSingle.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the recommendation for a given date", async () => {
    mockedServerRecommendationMaybeSingle.mockResolvedValue({
      data: {
        id: "rec-1",
        recommendation_date: "2026-04-17",
        root_word_id: "root-1",
        selected_by: "admin-1",
        root_word: {
          id: "root-1",
          root: "cred",
          meaning: "to believe",
          level: "basic",
        },
      },
      error: null,
    });

    await expect(getDailyRootRecommendationForDate("2026-04-17")).resolves.toEqual({
      id: "rec-1",
      recommendationDate: "2026-04-17",
      rootWordId: "root-1",
      selectedBy: "admin-1",
      rootWord: {
        id: "root-1",
        root: "cred",
        meaning: "to believe",
        level: "basic",
      },
    });

    expect(mockedServerRecommendationEq).toHaveBeenCalledWith("recommendation_date", "2026-04-17");
  });

  it("rejects unpublished roots when setting today's recommendation", async () => {
    mockedAdminRootMaybeSingle.mockResolvedValue({
      data: {
        id: "root-2",
        root: "dict",
        is_published: false,
      },
      error: null,
    });

    await expect(setTodayDailyRootRecommendation("root-2", "admin-1")).rejects.toThrow(
      "Chi co the de xuat root word da xuat ban.",
    );
    expect(mockedAdminRecommendationUpsert).not.toHaveBeenCalled();
  });

  it("upserts today's recommendation for the current Vietnam date", async () => {
    mockedAdminRootMaybeSingle.mockResolvedValue({
      data: {
        id: "root-1",
        root: "cred",
        is_published: true,
      },
      error: null,
    });
    mockedAdminRecommendationSingle.mockResolvedValue({
      data: {
        id: "rec-1",
        recommendation_date: "2026-04-17",
        root_word_id: "root-1",
        selected_by: "admin-1",
        root_word: {
          id: "root-1",
          root: "cred",
          meaning: "to believe",
          level: "basic",
        },
      },
      error: null,
    });

    await expect(setTodayDailyRootRecommendation("root-1", "admin-1")).resolves.toMatchObject({
      recommendationDate: "2026-04-17",
      rootWordId: "root-1",
    });

    expect(mockedAdminRecommendationUpsert).toHaveBeenCalledWith(
      {
        recommendation_date: "2026-04-17",
        root_word_id: "root-1",
        selected_by: "admin-1",
      },
      {
        onConflict: "recommendation_date",
      },
    );
  });
});
