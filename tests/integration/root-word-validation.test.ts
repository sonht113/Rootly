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
});

