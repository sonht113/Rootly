import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryState = vi.hoisted(() => ({
  rootWords: [] as Array<{
    id: string;
    root: string;
    meaning: string;
    description: string;
    level: "basic" | "intermediate" | "advanced";
    tags: string[];
    is_published: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>,
  words: [] as Array<{ root_word_id: string; word: string }>,
  plans: [] as Array<{ root_word_id: string; status: string }>,
  reviews: [] as Array<{
    id: string;
    root_word_id: string;
    status: string;
    review_date: string;
    review_step: number;
    completed_at: string | null;
    updated_at: string;
  }>,
  quizAttempts: [] as Array<{ root_word_id: string }>,
  studySessions: [] as Array<{
    root_word_id: string;
    session_type: string;
    result: Record<string, string | number | boolean | null> | null;
  }>,
}));

function createTableQuery<T>(data: T) {
  const query = {
    data,
    error: null,
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    or: vi.fn(() => query),
    range: vi.fn(() => query),
    then<TResult1 = Awaited<{ data: T; error: null }>, TResult2 = never>(
      onfulfilled?: ((value: Awaited<{ data: T; error: null }>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
    },
  };

  return query;
}

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "root_words") {
        return {
          select: () => createTableQuery(repositoryState.rootWords),
        };
      }

      if (table === "words") {
        return {
          select: (columns: string) => {
            if (columns === "root_word_id") {
              return createTableQuery([] as Array<{ root_word_id: string }>);
            }

            if (columns === "root_word_id, word") {
              return createTableQuery(repositoryState.words);
            }

            throw new Error(`Unexpected words columns: ${columns}`);
          },
        };
      }

      if (table === "user_root_plans") {
        return {
          select: () => createTableQuery(repositoryState.plans),
        };
      }

      if (table === "user_root_reviews") {
        return {
          select: () => createTableQuery(repositoryState.reviews),
        };
      }

      if (table === "quiz_attempts") {
        return {
          select: () => createTableQuery(repositoryState.quizAttempts),
        };
      }

      if (table === "study_sessions") {
        return {
          select: () => createTableQuery(repositoryState.studySessions),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getLibraryRootWords } from "@/server/repositories/root-words-repository";

describe("root-words repository mastery progress", () => {
  beforeEach(() => {
    repositoryState.rootWords = [
      {
        id: "root-1",
        root: "spect",
        meaning: "look",
        description: "Root related to seeing",
        level: "basic",
        tags: ["daily-use"],
        is_published: true,
        created_by: null,
        created_at: "2026-04-10T00:00:00.000Z",
        updated_at: "2026-04-10T00:00:00.000Z",
      },
    ];
    repositoryState.words = [{ root_word_id: "root-1", word: "inspect" }];
    repositoryState.plans = [];
    repositoryState.reviews = [];
    repositoryState.quizAttempts = [];
    repositoryState.studySessions = [];
  });

  it("returns 10 percent mastery after the learner completes a root detail view", async () => {
    repositoryState.studySessions = [
      {
        root_word_id: "root-1",
        session_type: "detail_view",
        result: {
          event: "root_detail_view",
        },
      },
    ];

    await expect(
      getLibraryRootWords({
        userId: "user-1",
      }),
    ).resolves.toMatchObject([
      {
        id: "root-1",
        masteryProgress: 10,
      },
    ]);
  });
});
