import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedRelatedWordsOr,
  mockedHydratedWordsIn,
  mockedHydratedWordsOrder,
  mockedRootWordsCountEq,
  mockedRootWordsCountOr,
  mockedRootWordsDataEq,
  mockedRootWordsDataOr,
  mockedRootWordsDataOrder,
  mockedRootWordsDataRange,
  repositoryState,
} = vi.hoisted(() => ({
  mockedRelatedWordsOr: vi.fn(),
  mockedHydratedWordsIn: vi.fn(),
  mockedHydratedWordsOrder: vi.fn(),
  mockedRootWordsCountEq: vi.fn(),
  mockedRootWordsCountOr: vi.fn(),
  mockedRootWordsDataEq: vi.fn(),
  mockedRootWordsDataOr: vi.fn(),
  mockedRootWordsDataOrder: vi.fn(),
  mockedRootWordsDataRange: vi.fn(),
  repositoryState: {
    relatedWordMatches: [] as Array<{ root_word_id: string }>,
    rootWordCount: 0,
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
    hydratedWords: [] as Array<{ root_word_id: string; word: string }>,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "words") {
        return {
          select: (columns: string) => {
            if (columns === "root_word_id") {
              const query = {
                data: repositoryState.relatedWordMatches,
                error: null,
                or: (...args: unknown[]) => {
                  mockedRelatedWordsOr(...args);
                  return query;
                },
              };

              return query;
            }

            if (columns === "root_word_id, word") {
              const query = {
                data: repositoryState.hydratedWords,
                error: null,
                in: (...args: unknown[]) => {
                  mockedHydratedWordsIn(...args);
                  return query;
                },
                order: (...args: unknown[]) => {
                  mockedHydratedWordsOrder(...args);
                  return query;
                },
              };

              return query;
            }

            throw new Error(`Unexpected words select columns: ${columns}`);
          },
        };
      }

      if (table === "root_words") {
        return {
          select: (_columns: string, options?: { count?: string; head?: boolean }) => {
            if (options?.head) {
              const countQuery = {
                count: repositoryState.rootWordCount,
                error: null,
                eq: (...args: unknown[]) => {
                  mockedRootWordsCountEq(...args);
                  return countQuery;
                },
                or: (...args: unknown[]) => {
                  mockedRootWordsCountOr(...args);
                  return countQuery;
                },
              };

              return countQuery;
            }

            const dataQuery = {
              data: repositoryState.rootWords,
              error: null,
              eq: (...args: unknown[]) => {
                mockedRootWordsDataEq(...args);
                return dataQuery;
              },
              order: (...args: unknown[]) => {
                mockedRootWordsDataOrder(...args);
                return dataQuery;
              },
              or: (...args: unknown[]) => {
                mockedRootWordsDataOr(...args);
                return dataQuery;
              },
              range: (...args: unknown[]) => {
                mockedRootWordsDataRange(...args);
                return dataQuery;
              },
            };

            return dataQuery;
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getLibraryRootWords, getPaginatedLibraryRootWords } from "@/server/repositories/root-words-repository";

describe("root-words repository search", () => {
  beforeEach(() => {
    mockedRelatedWordsOr.mockReset();
    mockedHydratedWordsIn.mockReset();
    mockedHydratedWordsOrder.mockReset();
    mockedRootWordsCountEq.mockReset();
    mockedRootWordsCountOr.mockReset();
    mockedRootWordsDataEq.mockReset();
    mockedRootWordsDataOr.mockReset();
    mockedRootWordsDataOrder.mockReset();
    mockedRootWordsDataRange.mockReset();

    repositoryState.relatedWordMatches = [];
    repositoryState.rootWordCount = 0;
    repositoryState.rootWords = [];
    repositoryState.hydratedWords = [];
  });

  it("finds a library root via related words and keeps pagination counts deduplicated", async () => {
    repositoryState.relatedWordMatches = [{ root_word_id: "root-1" }, { root_word_id: "root-1" }];
    repositoryState.rootWords = [
      {
        id: "root-1",
        root: "spect",
        meaning: "nhin; xem",
        description: "Root related to seeing",
        level: "basic",
        tags: ["daily-use"],
        is_published: true,
        created_by: null,
        created_at: "2026-04-10T00:00:00.000Z",
        updated_at: "2026-04-10T00:00:00.000Z",
      },
    ];
    repositoryState.hydratedWords = [
      { root_word_id: "root-1", word: "respect" },
      { root_word_id: "root-1", word: "spectator" },
    ];

    await expect(
      getPaginatedLibraryRootWords({
        query: "respect",
        page: 1,
        pageSize: 10,
        userId: null,
      }),
    ).resolves.toMatchObject({
      totalCount: 1,
      totalPages: 1,
      currentPage: 1,
      items: [
        {
          id: "root-1",
          root: "spect",
          wordCount: 2,
        },
      ],
    });

    expect(mockedRelatedWordsOr).toHaveBeenCalledWith(
      "word.ilike.%respect%,meaning_en.ilike.%respect%,meaning_vi.ilike.%respect%",
    );
    expect(mockedRootWordsDataOr).toHaveBeenCalledWith(
      "root.ilike.%respect%,meaning.ilike.%respect%,description.ilike.%respect%,id.in.(root-1)",
    );
    expect(mockedRootWordsCountOr).not.toHaveBeenCalled();
    expect(mockedRootWordsDataRange).not.toHaveBeenCalled();
    expect(mockedHydratedWordsIn).toHaveBeenCalledWith("root_word_id", ["root-1"]);
  });

  it("puts direct root matches ahead of related-word-only matches", async () => {
    repositoryState.relatedWordMatches = [{ root_word_id: "root-able" }, { root_word_id: "root-port" }];
    repositoryState.rootWords = [
      {
        id: "root-able",
        root: "able",
        meaning: "co the; co kha nang",
        description: "Suffix meaning capable of",
        level: "basic",
        tags: ["suffix"],
        is_published: true,
        created_by: null,
        created_at: "2026-04-10T00:00:00.000Z",
        updated_at: "2026-04-10T00:00:00.000Z",
      },
      {
        id: "root-port",
        root: "port",
        meaning: "carry",
        description: "Root related to carrying",
        level: "basic",
        tags: ["daily-use"],
        is_published: true,
        created_by: null,
        created_at: "2026-04-10T00:00:00.000Z",
        updated_at: "2026-04-10T00:00:00.000Z",
      },
    ];
    repositoryState.hydratedWords = [
      { root_word_id: "root-able", word: "portable" },
      { root_word_id: "root-port", word: "portable" },
    ];

    await expect(
      getPaginatedLibraryRootWords({
        query: "port",
        page: 1,
        pageSize: 10,
        userId: null,
      }),
    ).resolves.toMatchObject({
      totalCount: 2,
      totalPages: 1,
      currentPage: 1,
      items: [
        {
          id: "root-port",
          root: "port",
          wordCount: 1,
        },
        {
          id: "root-able",
          root: "able",
          wordCount: 1,
        },
      ],
    });

    expect(mockedRootWordsDataOr).toHaveBeenCalledWith(
      "root.ilike.%port%,meaning.ilike.%port%,description.ilike.%port%,id.in.(root-able,root-port)",
    );
    expect(mockedHydratedWordsIn).toHaveBeenCalledWith("root_word_id", ["root-port", "root-able"]);
  });

  it("still finds a root directly when the query only matches the root record", async () => {
    repositoryState.rootWords = [
      {
        id: "root-2",
        root: "bio",
        meaning: "su song",
        description: "Root related to life",
        level: "basic",
        tags: ["science"],
        is_published: true,
        created_by: null,
        created_at: "2026-04-10T00:00:00.000Z",
        updated_at: "2026-04-10T00:00:00.000Z",
      },
    ];
    repositoryState.hydratedWords = [{ root_word_id: "root-2", word: "biology" }];

    await expect(
      getLibraryRootWords({
        query: "bio",
        userId: null,
      }),
    ).resolves.toMatchObject([
      {
        id: "root-2",
        root: "bio",
        wordCount: 1,
      },
    ]);

    expect(mockedRelatedWordsOr).toHaveBeenCalledWith(
      "word.ilike.%bio%,meaning_en.ilike.%bio%,meaning_vi.ilike.%bio%",
    );
    expect(mockedRootWordsDataOr).toHaveBeenCalledWith(
      "root.ilike.%bio%,meaning.ilike.%bio%,description.ilike.%bio%",
    );
  });
});
