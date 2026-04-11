import * as XLSX from "xlsx";

import {
  rootWordQuizQuestionSchema,
  type RootWordQuizQuestionInput,
} from "@/lib/validations/root-word-quizzes";

const QUIZ_CSV_HEADERS = [
  "Question Type",
  "Question",
  "Correct Answer",
  "Explanation",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
] as const;

function readQuizWorkbook(buffer: Buffer, fileName: string) {
  if (!fileName.toLowerCase().endsWith(".csv")) {
    throw new Error("Chế độ nhập quiz chỉ hỗ trợ tệp CSV.");
  }

  const csv = buffer.toString("utf8").replace(/^\uFEFF/, "");
  return XLSX.read(csv, {
    type: "string",
    FS: ",",
    PRN: false,
  });
}

function normalizeNullableCell(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeQuizCsvRow(row: Record<string, unknown>) {
  return rootWordQuizQuestionSchema.safeParse({
    question_type: String(row["Question Type"] ?? "").trim().toLowerCase(),
    prompt: String(row.Question ?? "").trim(),
    correct_answer: String(row["Correct Answer"] ?? "").trim(),
    explanation: normalizeNullableCell(row.Explanation),
    option_a: normalizeNullableCell(row["Option A"]),
    option_b: normalizeNullableCell(row["Option B"]),
    option_c: normalizeNullableCell(row["Option C"]),
    option_d: normalizeNullableCell(row["Option D"]),
  });
}

export async function parseRootWordQuizImportFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const valid: RootWordQuizQuestionInput[] = [];
  const invalid: Array<{ index: number; message: string }> = [];

  try {
    const workbook = readQuizWorkbook(buffer, file.name);
    const firstSheet = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
      defval: "",
    });

    if (rows.length === 0) {
      throw new Error("Tệp CSV đang trống.");
    }

    const firstRow = rows[0] ?? {};
    const missingHeaders = QUIZ_CSV_HEADERS.filter((header) => !(header in firstRow));
    if (missingHeaders.length > 0) {
      throw new Error(`Thiếu các cột CSV bắt buộc: ${missingHeaders.join(", ")}`);
    }

    rows.forEach((row, index) => {
      const parsedRow = normalizeQuizCsvRow(row);
      if (parsedRow.success) {
        valid.push(parsedRow.data);
        return;
      }

      invalid.push({
        index: index + 2,
        message: parsedRow.error.issues.map((issue) => issue.message).join(", "),
      });
    });

    if (valid.length > 20) {
      invalid.push({
        index: 1,
        message: "Mỗi tệp nhập quiz chỉ hỗ trợ tối đa 20 câu hỏi.",
      });
    }
  } catch (error) {
    invalid.push({
      index: 1,
      message: error instanceof Error ? error.message : "Không thể phân tích tệp nhập quiz.",
    });
  }

  return { valid, invalid };
}
