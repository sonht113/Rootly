import { describe, expect, it } from "vitest";

import { parseClassLessonVocabularyImportFile } from "@/server/services/class-lesson-import-service";

describe("class lesson import service", () => {
  it("parses a valid lesson vocabulary CSV, preserves Vietnamese text and splits list fields", async () => {
    const csv = [
      "Word,Meaning,Synonyms,Example Sentences",
      '"classroom","phòng học","schoolroom|lecture room","The classroom is ready.|Students enter the classroom early."',
      '"teacher","giáo viên","instructor|educator","The teacher explains the lesson."',
    ].join("\n");

    const file = new File([csv], "class-lesson.csv", { type: "text/csv" });
    const result = await parseClassLessonVocabularyImportFile(file);

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toEqual([
      {
        word: "classroom",
        meaning: "phòng học",
        synonyms: ["schoolroom", "lecture room"],
        exampleSentences: ["The classroom is ready.", "Students enter the classroom early."],
      },
      {
        word: "teacher",
        meaning: "giáo viên",
        synonyms: ["instructor", "educator"],
        exampleSentences: ["The teacher explains the lesson."],
      },
    ]);
  });

  it("reports missing headers clearly", async () => {
    const csv = [
      "Word,Meaning,Example Sentences",
      '"classroom","phòng học","The classroom is ready."',
    ].join("\n");

    const file = new File([csv], "class-lesson-invalid.csv", { type: "text/csv" });
    const result = await parseClassLessonVocabularyImportFile(file);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.message).toContain("Thiếu các cột CSV bắt buộc");
  });

  it("rejects duplicate words inside one lesson CSV", async () => {
    const csv = [
      "Word,Meaning,Synonyms,Example Sentences",
      '"classroom","phòng học","schoolroom","The classroom is ready."',
      '"Classroom","phòng học","lecture room","Students clean the classroom."',
    ].join("\n");

    const file = new File([csv], "class-lesson-duplicate.csv", { type: "text/csv" });
    const result = await parseClassLessonVocabularyImportFile(file);

    expect(result.valid).toHaveLength(1);
    expect(result.invalid[0]?.message).toContain('Từ "Classroom"');
  });
});
