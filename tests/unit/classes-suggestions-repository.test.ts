import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

const {
  mockedCreateServerSupabaseClient,
  mockedGetUser,
  classMemberResponses,
  suggestionResponses,
  planResponses,
  classMemberEqCalls,
  suggestionInCalls,
  planEqCalls,
  planInCalls,
} = vi.hoisted(() => ({
  mockedCreateServerSupabaseClient: vi.fn(),
  mockedGetUser: vi.fn(),
  classMemberResponses: [] as Array<QueryResult<Array<{ class_id: string }>>>,
  suggestionResponses: [] as Array<
    QueryResult<
      Array<{
        id: string;
        class_id: string;
        root_word_id: string;
        suggested_date: string;
        class: { id: string; name: string } | null;
        root_word: { id: string; root: string; meaning: string; level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" } | null;
      }>
    >
  >,
  planResponses: [] as Array<QueryResult<Array<{ root_word_id: string; source: string }>>>,
  classMemberEqCalls: [] as Array<[string, unknown]>,
  suggestionInCalls: [] as Array<[string, unknown[]]>,
  planEqCalls: [] as Array<[string, unknown]>,
  planInCalls: [] as Array<[string, unknown[]]>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockedCreateServerSupabaseClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function takeNextResult<T>(queue: Array<QueryResult<T>>, label: string) {
  const next = queue.shift();

  if (!next) {
    throw new Error(`Missing mock response for ${label}`);
  }

  return next;
}

function createThenableQuery<T>(
  nextResult: () => QueryResult<T>,
  callbacks?: {
    onEq?: (column: string, value: unknown) => void;
    onIn?: (column: string, values: unknown[]) => void;
  },
) {
  const run = () => Promise.resolve(nextResult());

  const query = {
    eq(column: string, value: unknown) {
      callbacks?.onEq?.(column, value);
      return query;
    },
    in(column: string, values: unknown[]) {
      callbacks?.onIn?.(column, values);
      return query;
    },
    order() {
      return query;
    },
    then<TResult1 = Awaited<QueryResult<T>>, TResult2 = never>(
      onfulfilled?: ((value: Awaited<QueryResult<T>>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return run().then(onfulfilled, onrejected);
    },
  };

  return query;
}

import { getCurrentUserClassSuggestions } from "@/server/repositories/classes-repository";

describe("getCurrentUserClassSuggestions", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
    mockedGetUser.mockReset();
    classMemberResponses.length = 0;
    suggestionResponses.length = 0;
    planResponses.length = 0;
    classMemberEqCalls.length = 0;
    suggestionInCalls.length = 0;
    planEqCalls.length = 0;
    planInCalls.length = 0;

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
        if (table === "class_members") {
          return {
            select: () =>
              createThenableQuery(
                () => takeNextResult(classMemberResponses, "class_members"),
                {
                  onEq: (column, value) => {
                    classMemberEqCalls.push([column, value]);
                  },
                },
              ),
          };
        }

        if (table === "class_root_suggestions") {
          return {
            select: () =>
              createThenableQuery(
                () => takeNextResult(suggestionResponses, "class_root_suggestions"),
                {
                  onIn: (column, values) => {
                    suggestionInCalls.push([column, values]);
                  },
                },
              ),
          };
        }

        if (table === "user_root_plans") {
          return {
            select: () =>
              createThenableQuery(
                () => takeNextResult(planResponses, "user_root_plans"),
                {
                  onEq: (column, value) => {
                    planEqCalls.push([column, value]);
                  },
                  onIn: (column, values) => {
                    planInCalls.push([column, values]);
                  },
                },
              ),
          };
        }

        throw new Error(`Unexpected table mock: ${table}`);
      },
    });
  });

  it("returns an empty list immediately when the student has no classes", async () => {
    classMemberResponses.push({
      data: [],
      error: null,
    });

    await expect(getCurrentUserClassSuggestions()).resolves.toEqual([]);
    expect(suggestionInCalls).toEqual([]);
    expect(planEqCalls).toEqual([]);
  });

  it("filters suggestions by the student's classes and retries one transient upstream error", async () => {
    classMemberResponses.push({
      data: [
        { class_id: "class-1" },
        { class_id: "class-2" },
        { class_id: "class-2" },
      ],
      error: null,
    });
    suggestionResponses.push(
      {
        data: [],
        error: {
          message: "<html><body><h1>500 Internal Server Error</h1><center>cloudflare</center></body></html>",
        },
      },
      {
        data: [
          {
            id: "suggestion-1",
            class_id: "class-1",
            root_word_id: "root-1",
            suggested_date: "2026-04-10",
            class: { id: "class-1", name: "English Starter" },
            root_word: { id: "root-1", root: "spect", meaning: "nhin", level: "A2" },
          },
          {
            id: "suggestion-2",
            class_id: "class-2",
            root_word_id: "root-2",
            suggested_date: "2026-04-11",
            class: { id: "class-2", name: "Rootly Starter Class" },
            root_word: { id: "root-2", root: "port", meaning: "mang", level: "B1" },
          },
        ],
        error: null,
      },
    );
    planResponses.push({
      data: [{ root_word_id: "root-1", source: "teacher_suggested" }],
      error: null,
    });

    await expect(getCurrentUserClassSuggestions()).resolves.toEqual([
      {
        id: "suggestion-1",
        classId: "class-1",
        className: "English Starter",
        rootWord: {
          id: "root-1",
          root: "spect",
          meaning: "nhin",
          level: "A2",
        },
        suggestedDate: "2026-04-10",
        status: "accepted",
      },
      {
        id: "suggestion-2",
        classId: "class-2",
        className: "Rootly Starter Class",
        rootWord: {
          id: "root-2",
          root: "port",
          meaning: "mang",
          level: "B1",
        },
        suggestedDate: "2026-04-11",
        status: "pending",
      },
    ]);

    expect(suggestionInCalls).toEqual([
      ["class_id", ["class-1", "class-2"]],
      ["class_id", ["class-1", "class-2"]],
    ]);
    expect(planEqCalls).toEqual([["user_id", "student-1"]]);
    expect(planInCalls).toEqual([
      ["root_word_id", ["root-1", "root-2"]],
    ]);
  });

  it("does not retry non-transient suggestion errors", async () => {
    classMemberResponses.push({
      data: [{ class_id: "class-1" }],
      error: null,
    });
    suggestionResponses.push({
      data: [],
      error: {
        message: "permission denied for table class_root_suggestions",
      },
    });

    await expect(getCurrentUserClassSuggestions()).rejects.toThrow(
      "permission denied for table class_root_suggestions",
    );
    expect(suggestionInCalls).toEqual([["class_id", ["class-1"]]]);
  });
});
