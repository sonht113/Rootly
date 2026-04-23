import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseImportFile } from "@/server/services/import-service";

describe("import service", () => {
  it("parses csv rows into grouped root words", async () => {
    const csv = [
      "root,meaning,description,level,tags,word,part_of_speech,pronunciation,meaning_en,meaning_vi,english_sentence,vietnamese_sentence,usage_context,is_daily_usage,is_published",
      'spect,to look,Root related to seeing,basic,"daily-use,office",inspect,verb,/in-spekt/,to look carefully,kiem tra ky,"Please inspect the report.","Hay kiem tra bao cao.",workplace,true,true',
      'spect,to look,Root related to seeing,basic,"daily-use,office",respect,verb,/ri-spekt/,to admire,ton trong,"I respect your time.","Toi ton trong thoi gian cua ban.",office,true,true',
    ].join("\n");

    const file = new File([csv], "root-words.csv", { type: "text/csv" });
    const result = await parseImportFile(file);

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]?.words).toHaveLength(2);
  });

  it("reports invalid rows clearly", async () => {
    const csv = [
      "root,meaning,description,level,tags,word,part_of_speech,pronunciation,meaning_en,meaning_vi,english_sentence,vietnamese_sentence,usage_context,is_daily_usage,is_published",
      "sp,to,short,basic,,inspect,verb,,meaning,,bad,ok,,true,true",
    ].join("\n");

    const file = new File([csv], "invalid.csv", { type: "text/csv" });
    const result = await parseImportFile(file);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.message).toContain("Too small");
  });

  it("preserves Vietnamese text when parsing detailed CSV files", async () => {
    const csv = [
      "root,meaning,description,level,tags,word,part_of_speech,pronunciation,meaning_en,meaning_vi,english_sentence,vietnamese_sentence,usage_context,is_daily_usage,is_published",
      'port,mang; vận chuyển,"Gốc từ liên quan đến việc mang, vận chuyển và hỗ trợ",basic,"daily-use,travel",transport,verb,/trans-port/,to carry,vận chuyển,"We transport fresh fruit every morning.","Chúng tôi vận chuyển trái cây tươi mỗi sáng.",logistics,true,true',
    ].join("\n");

    const file = new File([csv], "root-words-vi.csv", { type: "text/csv" });
    const result = await parseImportFile(file);

    expect(result.invalid).toHaveLength(0);
    expect(result.valid[0]?.meaning).toBe("mang; vận chuyển");
    expect(result.valid[0]?.words[0]?.meaning_vi).toBe("vận chuyển");
    expect(result.valid[0]?.words[0]?.example_sentences[0]?.vietnamese_sentence).toBe("Chúng tôi vận chuyển trái cây tươi mỗi sáng.");
  });

  it("parses roots CSV imports with UTF-8 Vietnamese and pipe-separated word lists", async () => {
    const csv = [
      "Root Word,Meaning,Word List,Examples,Pronunciation",
      '"cred","to believe => tin; tín nhiệm","credible|credit|creed|credential|credence|credulous|discredit|accredit|credibility|miscreant","The source seems credible. => Nguồn này có vẻ đáng tin.|She has enough credit to rent the studio. => Cô ấy có đủ uy tín để thuê phòng thu.|The school will accredit the new program next year. => Trường sẽ cấp chứng nhận cho chương trình mới vào năm sau.","/kred/"',
    ].join("\n");

    const file = new File([csv], "roots-import-template.csv", { type: "text/csv" });
    const result = await parseImportFile(file, "roots");

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]?.meaning).toBe("tin; tín nhiệm");
    expect(result.valid[0]?.description).toBe('Nhóm gốc từ xoay quanh nghĩa "tin; tín nhiệm".');
    expect(result.valid[0]?.level).toBe("basic");
    expect(result.valid[0]?.words).toHaveLength(10);
    expect(result.valid[0]?.words[0]?.word).toBe("credible");
    expect(result.valid[0]?.words[0]?.meaning_vi).toBe("tin; tín nhiệm");
    expect(result.valid[0]?.words[0]?.example_sentences[0]?.vietnamese_sentence).toBe("Nguồn này có vẻ đáng tin.");
  });

  it("rejects duplicate words in detailed JSON imports before commit", async () => {
    const payload = JSON.stringify([
      {
        root: "port",
        meaning: "to carry",
        description: "Words related to carrying, bringing, or transporting.",
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
                english_sentence: "The store will import new goods.",
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
      },
    ]);

    const file = new File([payload], "root-words.json", { type: "application/json" });
    const result = await parseImportFile(file);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.message).toContain('Từ "Import" bị trùng');
  });

  it("parses the full roots-only template without validation errors", async () => {
    const templatePath = path.resolve(process.cwd(), "public/templates/root-words-full.csv");
    const csv = readFileSync(templatePath, "utf8");
    const file = new File([csv], "root-words-full.csv", { type: "text/csv" });

    const result = await parseImportFile(file, "roots");

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(60);
    expect(result.valid[0]?.level).toBe("basic");
    expect(result.valid[0]?.words.length).toBeGreaterThanOrEqual(5);
    expect(result.valid.at(-1)?.root).toBe("al");
  });
});
