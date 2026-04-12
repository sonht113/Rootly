import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseRootWordQuizImportFile } from "@/server/services/root-word-quiz-import-service";

const QUIZ_SAMPLE_DIR = path.join(process.cwd(), "public", "templates", "quiz-import");
const QUIZ_SAMPLE_FILES = [
  "quiz-import-template.csv",
  "quiz-spect.csv",
  "quiz-port.csv",
  "quiz-cred.csv",
  "quiz-dict.csv",
] as const;

async function parseFixture(fileName: string) {
  const csv = await readFile(path.join(QUIZ_SAMPLE_DIR, fileName), "utf8");
  const file = new File([csv], fileName, { type: "text/csv" });
  return parseRootWordQuizImportFile(file);
}

describe("root word quiz import service", () => {
  it.each(QUIZ_SAMPLE_FILES)("parses sample quiz CSV %s with 10 valid questions", async (fileName) => {
    const result = await parseFixture(fileName);

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(10);
  });

  it("preserves UTF-8 Vietnamese content in fixture files", async () => {
    const result = await parseFixture("quiz-cred.csv");

    expect(result.invalid).toHaveLength(0);
    expect(result.valid[6]?.prompt).toContain("đáng tin");
    expect(result.valid[7]?.explanation).toContain("sự tin tưởng");
  });

  it("reports missing headers clearly", async () => {
    const csv = [
      "Question Type,Question,Explanation,Option A,Option B,Option C,Option D",
      'multiple_choice,"Root ""dict"" gần nhất với nghĩa nào?","dict liên quan đến nói.",nói; ra lệnh,viết,nhìn; xem,mang; vận chuyển',
    ].join("\n");

    const file = new File([csv], "quiz-import-invalid.csv", { type: "text/csv" });
    const result = await parseRootWordQuizImportFile(file);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.message).toContain("Thiếu các cột CSV bắt buộc");
  });

  it("rejects invalid multiple choice rows", async () => {
    const csv = [
      "Question Type,Question,Correct Answer,Explanation,Option A,Option B,Option C,Option D",
      'multiple_choice,"Từ nào gần nghĩa nhất với ""phán quyết""?",dictation,"verdict mới đúng nên row này phải fail.",dictionary,predict,verdict,edict',
    ].join("\n");

    const file = new File([csv], "quiz-import-mismatch.csv", { type: "text/csv" });
    const result = await parseRootWordQuizImportFile(file);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.message).toContain("Correct Answer must match");
  });
});
