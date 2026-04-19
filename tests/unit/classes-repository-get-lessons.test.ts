import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult<T> = {
  data: T;
  error: { message?: string } | null;
};

const {
  mockedCreateServerSupabaseClient,
  lessonsResponse,
  vocabularyResponses,
  vocabularySelectCalls,
} = vi.hoisted(() => ({
  mockedCreateServerSupabaseClient: vi.fn(),
  lessonsResponse: {
    data: [
      {
        id: "lesson-1",
        class_id: "class-1",
        title: "Speaking",
        description: "Daily speaking practice",
        vocabulary_item_count: 1,
        created_at: "2026-04-19T10:00:00.000Z",
        updated_at: "2026-04-19T10:05:00.000Z",
      },
    ],
    error: null,
  } as QueryResult<
    Array<{
      id: string;
      class_id: string;
      title: string;
      description: string | null;
      vocabulary_item_count: number;
      created_at: string;
      updated_at: string;
    }>
  >,
  vocabularyResponses: [] as Array<QueryResult<Array<Record<string, unknown>>>>,
  vocabularySelectCalls: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockedCreateServerSupabaseClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getClassLessons } from "@/server/repositories/classes-repository";

describe("getClassLessons", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
    vocabularyResponses.length = 0;
    vocabularySelectCalls.length = 0;

    mockedCreateServerSupabaseClient.mockResolvedValue({
      from: (table: string) => {
        if (table === "class_lessons") {
          const query = {
            eq: () => query,
            order: () => Promise.resolve(lessonsResponse),
          };

          return {
            select: () => query,
          };
        }

        if (table === "class_lesson_vocab_items") {
          return {
            select: (selection: string) => {
              vocabularySelectCalls.push(selection);

              const query = {
                in: () => query,
                order: () => Promise.resolve(vocabularyResponses.shift()),
              };

              return query;
            },
          };
        }

        throw new Error(`Unexpected table mock: ${table}`);
      },
    });
  });

  it("falls back to the legacy lesson vocabulary query when the pronunciation column is missing", async () => {
    vocabularyResponses.push(
      {
        data: [],
        error: {
          message: "column class_lesson_vocab_items.pronunciation does not exist",
        },
      },
      {
        data: [
          {
            id: "item-1",
            lesson_id: "lesson-1",
            word: "classroom",
            meaning: "phòng học",
            synonyms: ["schoolroom"],
            example_sentences: ["The classroom is ready."],
            created_at: "2026-04-19T10:00:00.000Z",
            updated_at: "2026-04-19T10:01:00.000Z",
          },
        ],
        error: null,
      },
    );

    await expect(getClassLessons("class-1")).resolves.toEqual([
      {
        id: "lesson-1",
        classId: "class-1",
        title: "Speaking",
        description: "Daily speaking practice",
        vocabularyItemCount: 1,
        createdAt: "2026-04-19T10:00:00.000Z",
        updatedAt: "2026-04-19T10:05:00.000Z",
        vocabularyItems: [
          {
            id: "item-1",
            lessonId: "lesson-1",
            word: "classroom",
            meaning: "phòng học",
            pronunciation: null,
            synonyms: ["schoolroom"],
            exampleSentences: [
              {
                english: "The classroom is ready.",
                vietnamese: "",
              },
            ],
            createdAt: "2026-04-19T10:00:00.000Z",
            updatedAt: "2026-04-19T10:01:00.000Z",
          },
        ],
      },
    ]);

    expect(vocabularySelectCalls).toEqual([
      "id, lesson_id, word, meaning, pronunciation, synonyms, example_sentences, created_at, updated_at",
      "id, lesson_id, word, meaning, synonyms, example_sentences, created_at, updated_at",
    ]);
  });

  it("uses pronunciation immediately when the column exists", async () => {
    vocabularyResponses.push({
      data: [
        {
          id: "item-1",
          lesson_id: "lesson-1",
          word: "classroom",
          meaning: "phòng học",
          pronunciation: "/ˈklɑːsruːm/",
          synonyms: ["schoolroom"],
          example_sentences: [
            {
              english: "The classroom is ready.",
              vietnamese: "Phòng học đã sẵn sàng.",
            },
          ],
          created_at: "2026-04-19T10:00:00.000Z",
          updated_at: "2026-04-19T10:01:00.000Z",
        },
      ],
      error: null,
    });

    const result = await getClassLessons("class-1");

    expect(result[0]?.vocabularyItems[0]?.pronunciation).toBe("/ˈklɑːsruːm/");
    expect(result[0]?.vocabularyItems[0]?.exampleSentences).toEqual([
      {
        english: "The classroom is ready.",
        vietnamese: "Phòng học đã sẵn sàng.",
      },
    ]);
    expect(vocabularySelectCalls).toHaveLength(1);
  });

  it("parses stringified JSON example sentences into bilingual display data", async () => {
    vocabularyResponses.push({
      data: [
        {
          id: "item-1",
          lesson_id: "lesson-1",
          word: "classroom",
          meaning: "phÃ²ng há»c",
          pronunciation: "/ËˆklÉ‘ËsruËm/",
          synonyms: ["schoolroom"],
          example_sentences: [
            '{"english":"Remember to brush your teeth before bed.","vietnamese":"HÃ£y nhá»› Ä‘Ã¡nh rÄƒng trÆ°á»›c khi Ä‘i ngá»§."}',
          ],
          created_at: "2026-04-19T10:00:00.000Z",
          updated_at: "2026-04-19T10:01:00.000Z",
        },
      ],
      error: null,
    });

    const result = await getClassLessons("class-1");

    expect(result[0]?.vocabularyItems[0]?.exampleSentences).toEqual([
      {
        english: "Remember to brush your teeth before bed.",
        vietnamese: "HÃ£y nhá»› Ä‘Ã¡nh rÄƒng trÆ°á»›c khi Ä‘i ngá»§.",
      },
    ]);
  });

  it("still throws non-schema errors from the vocabulary query", async () => {
    vocabularyResponses.push({
      data: [],
      error: {
        message: "permission denied",
      },
    });

    await expect(getClassLessons("class-1")).rejects.toThrow("permission denied");
  });
});
