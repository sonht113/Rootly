import * as XLSX from "xlsx";

import {
  EXAM_MAX_QUESTION_COUNT,
  EXAM_QUESTION_BANK_IMPORT_HEADERS,
  examQuestionBankImportCsvRowSchema,
  type ExamQuestionBankImportQuestionInput,
} from "@/lib/validations/exams";

function readExamQuestionBankWorkbook(buffer: Buffer, fileName: string) {
  if (!fileName.toLowerCase().endsWith(".csv")) {
    throw new Error("Chế độ nhập câu hỏi chỉ hỗ trợ tệp CSV.");
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

function normalizeImportRow(row: Record<string, unknown>) {
  return examQuestionBankImportCsvRowSchema.safeParse({
    prompt: String(row.Question ?? "").trim(),
    option_a: String(row["Option A"] ?? "").trim(),
    option_b: String(row["Option B"] ?? "").trim(),
    option_c: String(row["Option C"] ?? "").trim(),
    option_d: String(row["Option D"] ?? "").trim(),
    correct_answer_code: String(row["Correct Answer"] ?? "").trim(),
    explanation: normalizeNullableCell(row.Explanation),
  });
}

export function getExamQuestionImportSelectionLimitMessage(selectedQuestionCount: number, importCount: number) {
  if (selectedQuestionCount + importCount <= EXAM_MAX_QUESTION_COUNT) {
    return null;
  }

  return `Bộ đề chỉ hỗ trợ tối đa ${EXAM_MAX_QUESTION_COUNT} câu hỏi. Hiện tại đã chọn ${selectedQuestionCount} câu và file này có ${importCount} câu hợp lệ.`;
}

export async function parseExamQuestionBankImportFile(
  file: File,
  options?: { selectedQuestionCount?: number | null },
) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const valid: ExamQuestionBankImportQuestionInput[] = [];
  const invalid: Array<{ index: number; message: string }> = [];

  try {
    const workbook = readExamQuestionBankWorkbook(buffer, file.name);
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];

    const headerRows = XLSX.utils.sheet_to_json<Array<unknown>>(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    if (headerRows.length === 0) {
      throw new Error("Tệp CSV đang trống.");
    }

    const headers = (headerRows[0] ?? []).map((value) => String(value ?? "").trim());
    const missingHeaders = EXAM_QUESTION_BANK_IMPORT_HEADERS.filter((header) => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new Error(`Thiếu các cột CSV bắt buộc: ${missingHeaders.join(", ")}`);
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
    });

    if (rows.length === 0) {
      throw new Error("Tệp CSV đang trống.");
    }

    rows.forEach((row, index) => {
      const parsedRow = normalizeImportRow(row);
      if (parsedRow.success) {
        valid.push(parsedRow.data);
        return;
      }

      invalid.push({
        index: index + 2,
        message: parsedRow.error.issues.map((issue) => issue.message).join(", "),
      });
    });

    const selectedQuestionCount = options?.selectedQuestionCount ?? 0;
    const selectionLimitMessage = getExamQuestionImportSelectionLimitMessage(selectedQuestionCount, valid.length);
    if (selectionLimitMessage) {
      invalid.push({
        index: 1,
        message: selectionLimitMessage,
      });
    }
  } catch (error) {
    invalid.push({
      index: 1,
      message: error instanceof Error ? error.message : "Không thể phân tích tệp import câu hỏi.",
    });
  }

  return { valid, invalid };
}
