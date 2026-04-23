import { ZodError } from "zod";
import { describe, expect, it } from "vitest";

import { rootWordSchema } from "@/lib/validations/root-words";

describe("root word validation flow", () => {
  it("accepts a nested root word payload used by admin form and import flow", () => {
    const parsed = rootWordSchema.parse({
      root: "dict",
      meaning: "to say",
      description: "This root appears in words related to speaking or declaring.",
      level: "basic",
      tags: ["communication"],
      is_published: true,
      words: [
        {
          word: "predict",
          part_of_speech: "verb",
          pronunciation: "/pri-dikt/",
          meaning_en: "to say in advance",
          meaning_vi: "du doan",
          example_sentences: [
            {
              english_sentence: "Can you predict what will happen next?",
              vietnamese_sentence: "Ban co the du doan dieu gi se xay ra tiep theo khong?",
              usage_context: "conversation",
              is_daily_usage: true,
            },
          ],
        },
      ],
    });

    expect(parsed.words[0]?.example_sentences[0]?.is_daily_usage).toBe(true);
  });

  it("rejects duplicate words case-insensitively inside one root payload", () => {
    try {
      rootWordSchema.parse({
        root: "port",
        meaning: "to carry",
        description: "This root appears in words related to carrying or transporting.",
        level: "basic",
        tags: ["travel"],
        is_published: true,
        words: [
          {
            word: "import",
            part_of_speech: "verb",
            pronunciation: "/im-port/",
            meaning_en: "to bring in",
            meaning_vi: "nhap vao",
            example_sentences: [
              {
                english_sentence: "The shop will import new goods.",
                vietnamese_sentence: "Cua hang se nhap hang moi.",
                usage_context: "business",
                is_daily_usage: true,
              },
            ],
          },
          {
            word: "Import",
            part_of_speech: "noun",
            pronunciation: "/im-port/",
            meaning_en: "goods brought in",
            meaning_vi: "hang nhap",
            example_sentences: [
              {
                english_sentence: "Import costs increased this month.",
                vietnamese_sentence: "Chi phi hang nhap tang trong thang nay.",
                usage_context: "business",
                is_daily_usage: true,
              },
            ],
          },
        ],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      expect((error as ZodError).issues[0]?.message).toBe('Từ "Import" bị trùng trong root "port".');
      return;
    }

    throw new Error("Expected duplicate root words to fail validation.");
  });
});
