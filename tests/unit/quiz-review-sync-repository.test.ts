import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

const {
  mockedCreateServerSupabaseClient,
  mockedGetUser,
  mockedCompleteLearningPlanRpc,
  planSelectResponses,
  reviewSelectResponses,
  reviewInsertPayloads,
} = vi.hoisted(() => ({
  mockedCreateServerSupabaseClient: vi.fn(),
  mockedGetUser: vi.fn(),
  mockedCompleteLearningPlanRpc: vi.fn(),
  planSelectResponses: [] as Array<QueryResult<Array<{ id: string; scheduled_date: string; created_at: string }>>>,
  reviewSelectResponses: [] as Array<QueryResult<Array<{ review_step: number }>>>,
  reviewInsertPayloads: [] as Array<Array<Record<string, unknown>>>,
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

function createThenableQuery<T>(
  result: QueryResult<T>,
  onEq?: (column: string, value: unknown) => void,
  onIn?: (column: string, values: unknown[]) => void,
) {
  const query = {
    eq(column: string, value: unknown) {
      onEq?.(column, value);
      return query;
    },
    in(column: string, values: unknown[]) {
      onIn?.(column, values);
      return query;
    },
    then<TResult1 = Awaited<QueryResult<T>>, TResult2 = never>(
      onfulfilled?: ((value: Awaited<QueryResult<T>>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
  };

  return query;
}

import { syncQuizCompletionForRootWord } from "@/server/repositories/study-repository";

describe("syncQuizCompletionForRootWord", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
    mockedGetUser.mockReset();
    mockedCompleteLearningPlanRpc.mockReset();
    planSelectResponses.length = 0;
    reviewSelectResponses.length = 0;
    reviewInsertPayloads.length = 0;

    mockedGetUser.mockResolvedValue({
      data: {
        user: { id: "student-1" },
      },
    });
  });

  it("creates the review cycle when the learner finishes a quiz without an active study plan", async () => {
    planSelectResponses.push({
      data: [],
      error: null,
    });
    reviewSelectResponses.push({
      data: [],
      error: null,
    });

    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: mockedGetUser,
      },
      from: (table: string) => {
        if (table === "user_root_plans") {
          return {
            select: () => createThenableQuery(takeNextResult(planSelectResponses, "select user_root_plans")),
          };
        }

        if (table === "user_root_reviews") {
          return {
            select: () => createThenableQuery(takeNextResult(reviewSelectResponses, "select user_root_reviews")),
            insert: (payload: Array<Record<string, unknown>>) => {
              reviewInsertPayloads.push(payload);
              return Promise.resolve({
                data: null,
                error: null,
              });
            },
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    });

    await expect(syncQuizCompletionForRootWord("root-1")).resolves.toEqual({
      completedLearningPlan: false,
      planId: null,
      reviewCycleCreated: true,
    });

    expect(reviewInsertPayloads).toHaveLength(1);
    expect(reviewInsertPayloads[0]?.map((item) => item.review_step)).toEqual([1, 2, 3]);
    expect(reviewInsertPayloads[0]?.every((item) => item.user_id === "student-1" && item.root_word_id === "root-1")).toBe(true);
  });

  it("completes the nearest active study plan before syncing the review cycle", async () => {
    planSelectResponses.push({
      data: [
        {
          id: "plan-1",
          scheduled_date: "2026-04-22",
          created_at: "2026-04-22T08:00:00.000Z",
        },
      ],
      error: null,
    });
    reviewSelectResponses.push({
      data: [],
      error: null,
    });

    mockedCreateServerSupabaseClient
      .mockResolvedValueOnce({
        auth: {
          getUser: mockedGetUser,
        },
        from: (table: string) => {
          if (table === "user_root_plans") {
            return {
              select: () => createThenableQuery(takeNextResult(planSelectResponses, "select user_root_plans")),
            };
          }

          if (table === "user_root_reviews") {
            return {
              select: () => createThenableQuery(takeNextResult(reviewSelectResponses, "select user_root_reviews")),
              insert: (payload: Array<Record<string, unknown>>) => {
                reviewInsertPayloads.push(payload);
                return Promise.resolve({
                  data: null,
                  error: null,
                });
              },
            };
          }

          throw new Error(`Unexpected table: ${table}`);
        },
      })
      .mockResolvedValueOnce({
        rpc: mockedCompleteLearningPlanRpc,
      });

    mockedCompleteLearningPlanRpc.mockResolvedValue({
      data: { status: "completed" },
      error: null,
    });

    await expect(syncQuizCompletionForRootWord("root-1")).resolves.toEqual({
      completedLearningPlan: true,
      planId: "plan-1",
      reviewCycleCreated: true,
    });

    expect(mockedCompleteLearningPlanRpc).toHaveBeenCalledWith("complete_learning_plan", {
      p_plan_id: "plan-1",
    });
    expect(reviewInsertPayloads).toHaveLength(1);
  });
});
