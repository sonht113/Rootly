import { describe, expect, it } from "vitest";

import { parseRootWordQuizImportFile } from "@/server/services/root-word-quiz-import-service";

describe("root word quiz import service", () => {
  it("parses a valid mixed quiz CSV", async () => {
    const csv = [
      "Question Type,Question,Correct Answer,Explanation,Option A,Option B,Option C,Option D",
      'multiple_choice,"Root ""port"" gần nhất với nghĩa nào?",mang; vận chuyển,"port liên quan đến việc mang hoặc vận chuyển.",mang; vận chuyển,nhìn; xem,viết,nói; ra lệnh',
      'text,"Viết một từ thuộc root ""port"" có nghĩa là ""hộ chiếu"".",passport,"passport là đáp án mẫu phù hợp.",,,,',
    ].join("\n");

    const file = new File([csv], "quiz-import.csv", { type: "text/csv" });
    const result = await parseRootWordQuizImportFile(file);

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]?.question_type).toBe("multiple_choice");
    expect(result.valid[1]?.question_type).toBe("text");
  });

  it("preserves UTF-8 Vietnamese content", async () => {
    const csv = [
      "Question Type,Question,Correct Answer,Explanation,Option A,Option B,Option C,Option D",
      'multiple_choice,"Root ""cred"" gần nhất với nghĩa nào?",tin; tín nhiệm,"cred liên quan đến niềm tin và tín nhiệm.",tin; tín nhiệm,ném; quăng,xây dựng,nhìn; xem',
    ].join("\n");

    const file = new File([csv], "quiz-import-vi.csv", { type: "text/csv" });
    const result = await parseRootWordQuizImportFile(file);

    expect(result.invalid).toHaveLength(0);
    expect(result.valid[0]?.correct_answer).toBe("tin; tín nhiệm");
    expect(result.valid[0]?.option_a).toBe("tin; tín nhiệm");
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
