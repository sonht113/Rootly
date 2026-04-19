import { describe, expect, it } from "vitest";

import { parseClassLessonVocabularyImportFile } from "@/server/services/class-lesson-import-service";

describe("class lesson import service", () => {
  it("parses a valid lesson vocabulary CSV with pronunciation and preserves Vietnamese text", async () => {
    const csv = [
      "Word,Meaning,Pronunciation,Synonyms,Example Sentence 1 EN,Example Sentence 1 VI,Example Sentence 2 EN,Example Sentence 2 VI,Example Sentence 3 EN,Example Sentence 3 VI",
      '"classroom","phòng học","/ˈklɑːsruːm/","schoolroom|lecture room","The classroom is ready.","Phòng học đã sẵn sàng.","Students enter the classroom early.","Học sinh vào lớp sớm.","We decorate the classroom before the lesson.","Chúng tôi trang trí lớp học trước buổi học."',
      '"teacher","giáo viên","/ˈtiːtʃə(r)/","instructor|educator","The teacher explains the lesson clearly.","Giáo viên giải thích bài học rõ ràng.","","","",""',
    ].join("\n");

    const file = new File([csv], "class-lesson.csv", { type: "text/csv" });
    const result = await parseClassLessonVocabularyImportFile(file);

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toEqual([
      {
        word: "classroom",
        meaning: "phòng học",
        pronunciation: "/ˈklɑːsruːm/",
        synonyms: ["schoolroom", "lecture room"],
        exampleSentences: [
          {
            english: "The classroom is ready.",
            vietnamese: "Phòng học đã sẵn sàng.",
          },
          {
            english: "Students enter the classroom early.",
            vietnamese: "Học sinh vào lớp sớm.",
          },
          {
            english: "We decorate the classroom before the lesson.",
            vietnamese: "Chúng tôi trang trí lớp học trước buổi học.",
          },
        ],
      },
      {
        word: "teacher",
        meaning: "giáo viên",
        pronunciation: "/ˈtiːtʃə(r)/",
        synonyms: ["instructor", "educator"],
        exampleSentences: [
          {
            english: "The teacher explains the lesson clearly.",
            vietnamese: "Giáo viên giải thích bài học rõ ràng.",
          },
        ],
      },
    ]);
  });

  it("supports legacy CSV files that do not include the Pronunciation column", async () => {
    const csv = [
      "Word,Meaning,Synonyms,Example Sentence 1 EN,Example Sentence 1 VI,Example Sentence 2 EN,Example Sentence 2 VI,Example Sentence 3 EN,Example Sentence 3 VI",
      '"classroom","phòng học","schoolroom|lecture room","The classroom is ready.","Phòng học đã sẵn sàng.","","","",""',
    ].join("\n");

    const file = new File([csv], "class-lesson-legacy.csv", { type: "text/csv" });
    const result = await parseClassLessonVocabularyImportFile(file);

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toEqual([
      {
        word: "classroom",
        meaning: "phòng học",
        pronunciation: null,
        synonyms: ["schoolroom", "lecture room"],
        exampleSentences: [
          {
            english: "The classroom is ready.",
            vietnamese: "Phòng học đã sẵn sàng.",
          },
        ],
      },
    ]);
  });

  it("reports missing headers clearly", async () => {
    const csv = [
      "Word,Meaning,Example Sentence 1 EN",
      '"classroom","phòng học","The classroom is ready."',
    ].join("\n");

    const file = new File([csv], "class-lesson-invalid.csv", { type: "text/csv" });
    const result = await parseClassLessonVocabularyImportFile(file);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.message).toContain("Thiếu các cột CSV bắt buộc");
  });

  it("rejects duplicate words inside one lesson CSV", async () => {
    const csv = [
      "Word,Meaning,Pronunciation,Synonyms,Example Sentence 1 EN,Example Sentence 1 VI,Example Sentence 2 EN,Example Sentence 2 VI,Example Sentence 3 EN,Example Sentence 3 VI",
      '"classroom","phòng học","/ˈklɑːsruːm/","schoolroom","The classroom is ready.","Phòng học đã sẵn sàng.","","","",""',
      '"Classroom","phòng học","/ˈklɑːsruːm/","lecture room","Students clean the classroom.","Học sinh dọn lớp học.","","","",""',
    ].join("\n");

    const file = new File([csv], "class-lesson-duplicate.csv", { type: "text/csv" });
    const result = await parseClassLessonVocabularyImportFile(file);

    expect(result.valid).toHaveLength(1);
    expect(result.invalid[0]?.message).toContain('Từ "Classroom"');
  });

  it("rejects rows when an example translation is missing", async () => {
    const csv = [
      "Word,Meaning,Pronunciation,Synonyms,Example Sentence 1 EN,Example Sentence 1 VI,Example Sentence 2 EN,Example Sentence 2 VI,Example Sentence 3 EN,Example Sentence 3 VI",
      '"classroom","phòng học","/ˈklɑːsruːm/","schoolroom","The classroom is ready.","","","","",""',
    ].join("\n");

    const file = new File([csv], "class-lesson-missing-translation.csv", { type: "text/csv" });
    const result = await parseClassLessonVocabularyImportFile(file);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.message).toContain("Example Sentence 1 VI");
  });
});
