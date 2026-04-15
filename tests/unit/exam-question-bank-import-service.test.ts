import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseExamQuestionBankImportFile } from "@/server/services/exam-question-bank-import-service";

const SAMPLE_DIR = path.join(process.cwd(), "public", "templates", "exam-question-bank-import");

async function parseFixture(fileName: string, selectedQuestionCount?: number) {
  const csv = await readFile(path.join(SAMPLE_DIR, fileName), "utf8");
  const file = new File([csv], fileName, { type: "text/csv" });
  return parseExamQuestionBankImportFile(file, { selectedQuestionCount });
}

describe("exam question bank import service", () => {
  it("parses the sample CSV with valid multiple choice questions", async () => {
    const result = await parseFixture("exam-question-bank-import-sample.csv");

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(3);
    expect(result.valid[0]).toMatchObject({
      question_type: "multiple_choice",
      correct_answer: "look",
    });
  });

  it("reports missing headers clearly", async () => {
    const csv = [
      "Question,Option A,Option B,Option C,Option D,Explanation",
      '"Root ""spect"" is closest to which meaning?","look","write","carry","say","spect relates to looking or seeing."',
    ].join("\n");

    const file = new File([csv], "exam-question-bank-import-invalid.csv", { type: "text/csv" });
    const result = await parseExamQuestionBankImportFile(file);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.message).toContain("Thiếu các cột CSV bắt buộc");
  });

  it("rejects rows whose correct answer is not A/B/C/D", async () => {
    const csv = [
      "Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation",
      '"Which word means belief?","credit","verdict","inspect","dictate","credit","cred is related to belief or trust."',
    ].join("\n");

    const file = new File([csv], "exam-question-bank-import-invalid-answer.csv", { type: "text/csv" });
    const result = await parseExamQuestionBankImportFile(file);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.message).toContain("Correct Answer");
  });

  it("flags preview when imported questions would push the exam above 50 selected questions", async () => {
    const result = await parseFixture("exam-question-bank-import-sample.csv", 49);

    expect(result.valid).toHaveLength(3);
    expect(result.invalid.some((item) => item.message.includes("tối đa 50 câu hỏi"))).toBe(true);
  });
});
