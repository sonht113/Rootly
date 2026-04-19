import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

const {
  mockedCreateServerSupabaseClient,
  mockedGetUser,
  selectResponses,
  insertResponses,
  updateResponses,
  selectEqCalls,
  selectNeqCalls,
  insertPayloads,
  updatePayloads,
  updateEqCalls,
} = vi.hoisted(() => ({
  mockedCreateServerSupabaseClient: vi.fn(),
  mockedGetUser: vi.fn(),
  selectResponses: [] as Array<QueryResult<Array<{ id: string; root_word_id?: string; source?: string }>>>,
  insertResponses: [] as Array<QueryResult<null>>,
  updateResponses: [] as Array<QueryResult<null>>,
  selectEqCalls: [] as Array<[string, unknown]>,
  selectNeqCalls: [] as Array<[string, unknown]>,
  insertPayloads: [] as Array<Record<string, unknown>>,
  updatePayloads: [] as Array<Record<string, unknown>>,
  updateEqCalls: [] as Array<[string, unknown]>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockedCreateServerSupabaseClient,
}));

function takeNextResult<T>(queue: Array<QueryResult<T>>, label: string) {
  const next = queue.shift();

  if (!next) {
    throw new Error(`Missing mock response for ${label}`);
  }

  return next;
}

function createSelectQuery() {
  const query = {
    eq(column: string, value: unknown) {
      selectEqCalls.push([column, value]);
      return query;
    },
    neq(column: string, value: unknown) {
      selectNeqCalls.push([column, value]);
      return query;
    },
    order() {
      return query;
    },
    limit() {
      return Promise.resolve(takeNextResult(selectResponses, "select user_root_plans"));
    },
  };

  return query;
}

function createUpdateQuery() {
  const query = {
    eq(column: string, value: unknown) {
      updateEqCalls.push([column, value]);
      return query;
    },
    then<TResult1 = Awaited<QueryResult<null>>, TResult2 = never>(
      onfulfilled?: ((value: Awaited<QueryResult<null>>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(takeNextResult(updateResponses, "update user_root_plans")).then(onfulfilled, onrejected);
    },
  };

  return query;
}

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { createStudyPlan, updateStudyPlan } from "@/server/repositories/study-repository";

describe("study plan mutations", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
    mockedGetUser.mockReset();
    selectResponses.length = 0;
    insertResponses.length = 0;
    updateResponses.length = 0;
    selectEqCalls.length = 0;
    selectNeqCalls.length = 0;
    insertPayloads.length = 0;
    updatePayloads.length = 0;
    updateEqCalls.length = 0;

    mockedGetUser.mockResolvedValue({
      data: {
        user: { id: "student-1" },
      },
      error: null,
    });

    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: mockedGetUser,
      },
      from: (table: string) => {
        if (table !== "user_root_plans") {
          throw new Error(`Unexpected table mock: ${table}`);
        }

        return {
          select: () => createSelectQuery(),
          insert: (payload: Record<string, unknown>) => {
            insertPayloads.push(payload);
            return Promise.resolve(takeNextResult(insertResponses, "insert user_root_plans"));
          },
          update: (payload: Record<string, unknown>) => {
            updatePayloads.push(payload);
            return createUpdateQuery();
          },
        };
      },
    });
  });

  it("rejects creating another learning plan for the same root word even on a different date", async () => {
    selectResponses.push({
      data: [{ id: "plan-1", root_word_id: "root-1", source: "manual" }],
      error: null,
    });

    await expect(
      createStudyPlan({
        rootWordId: "root-1",
        scheduledDate: "2026-04-20",
        source: "manual",
      }),
    ).rejects.toThrow("Từ gốc này đã có trong lịch học của bạn");

    expect(insertPayloads).toEqual([]);
    expect(selectEqCalls).toEqual([
      ["user_id", "student-1"],
      ["root_word_id", "root-1"],
    ]);
  });

  it("normalizes a database unique violation into the duplicate-plan business error", async () => {
    selectResponses.push({
      data: [],
      error: null,
    });
    insertResponses.push({
      data: null,
      error: {
        message: 'duplicate key value violates unique constraint "user_root_plans_user_id_root_word_id_key"',
      },
    });

    await expect(
      createStudyPlan({
        rootWordId: "root-1",
        scheduledDate: "2026-04-20",
        source: "manual",
      }),
    ).rejects.toThrow("Từ gốc này đã có trong lịch học của bạn");

    expect(insertPayloads).toEqual([
      {
        user_id: "student-1",
        root_word_id: "root-1",
        scheduled_date: "2026-04-20",
        source: "manual",
      },
    ]);
  });

  it("blocks updating a plan to a root word that already belongs to another plan", async () => {
    selectResponses.push({
      data: [{ id: "plan-2", root_word_id: "root-2", source: "manual" }],
      error: null,
    });

    await expect(
      updateStudyPlan({
        id: "plan-1",
        rootWordId: "root-2",
        scheduledDate: "2026-04-22",
        source: "manual",
      }),
    ).rejects.toThrow("Từ gốc này đã có trong lịch học của bạn");

    expect(updatePayloads).toEqual([]);
    expect(selectEqCalls).toEqual([
      ["user_id", "student-1"],
      ["root_word_id", "root-2"],
    ]);
    expect(selectNeqCalls).toEqual([["id", "plan-1"]]);
  });

  it("updates the plan when the root word is still unique for the current user", async () => {
    selectResponses.push({
      data: [],
      error: null,
    });
    updateResponses.push({
      data: null,
      error: null,
    });

    await expect(
      updateStudyPlan({
        id: "plan-1",
        rootWordId: "root-2",
        scheduledDate: "2026-04-22",
        source: "manual",
      }),
    ).resolves.toBeUndefined();

    expect(updatePayloads).toEqual([
      {
        root_word_id: "root-2",
        scheduled_date: "2026-04-22",
        source: "manual",
      },
    ]);
    expect(updateEqCalls).toEqual([
      ["id", "plan-1"],
      ["user_id", "student-1"],
    ]);
  });
});
